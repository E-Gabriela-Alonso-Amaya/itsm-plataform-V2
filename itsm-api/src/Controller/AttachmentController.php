<?php

namespace App\Controller;

use App\Entity\Attachment;
use App\Entity\User as AppUser;
use App\Repository\AttachmentRepository;
use App\Repository\IncidentRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\ResponseHeaderBag;
use Symfony\Component\Routing\Attribute\Route;
use OpenApi\Attributes as OA;
use Psr\Log\LoggerInterface;

#[OA\Tag(name: 'Adjuntos', description: 'Gestión de archivos adjuntos a incidencias')]
#[Route('/api/incidents/{incidentId}/attachments', name: 'attachment_')]
class AttachmentController extends AbstractController
{
    private const ALLOWED_MIMES = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    private const MAX_SIZE = 2 * 1024 * 1024; // Ajustado a 2 MB para coincidir con el límite de PHP detectado (upload_max_filesize)

    private IncidentRepository $incidentRepo;
    private EntityManagerInterface $em;
    private LoggerInterface $logger;

    public function __construct(
        IncidentRepository $incidentRepo,
        EntityManagerInterface $em,
        LoggerInterface $logger
    ) {
        $this->incidentRepo = $incidentRepo;
        $this->em = $em;
        $this->logger = $logger;
    }

    // ─── 1. LIST ──────────────────────────────────────────────────────────────
    #[Route('', name: 'list', methods: ['GET'])]
    public function list(
        string $incidentId,
        AttachmentRepository $attachmentRepo
    ): JsonResponse {
        /** @var AppUser|null $user */
        $user = $this->getUser();
        if (!$user) return $this->json(['error' => 'No autenticado'], 401);

        $incident = $this->incidentRepo->find($incidentId);
        if (!$incident) {
            return $this->json(['error' => 'Incidencia no encontrada'], 404);
        }

        if (!$this->isAdminOrAgent($user) && $incident->getReportedBy()->getId() !== $user->getId()) {
            return $this->json(['error' => 'Sin permiso'], 403);
        }

        $attachments = $attachmentRepo->findBy(['incident' => $incident], ['createdAt' => 'DESC']);

        return $this->json(array_map(fn($a) => $this->serialize($a), $attachments));
    }

    // ─── 2. UPLOAD ────────────────────────────────────────────────────────────
    #[Route('', name: 'upload', methods: ['POST'])]
    public function upload(
        string $incidentId,
        Request $request
    ): JsonResponse {
        try {
            /** @var AppUser|null $user */
            $user = $this->getUser();
            if (!$user) {
                return $this->json(['error' => 'Sesión expirada o no válida'], 401);
            }

            $incident = $this->incidentRepo->find($incidentId);
            if (!$incident) {
                return $this->json(['error' => 'Incidencia no encontrada'], 404);
            }

            // Comparación de IDs como strings para mayor seguridad
            $isOwner = (string)$incident->getReportedBy()->getId() === (string)$user->getId();
            if (!$this->isAdminOrAgent($user) && !$isOwner) {
                return $this->json(['error' => 'Sin permiso para subir adjuntos'], 403);
            }

            $file = $request->files->get('file');
            if (!$file) {
                if ($request->isMethod('POST')) {
                    return $this->json(['error' => 'El archivo no pudo ser procesado. Es posible que sea demasiado grande para la configuración actual del servidor (Límite PHP: 2MB).'], 413);
                }
                return $this->json(['error' => 'No se ha enviado ningún archivo'], 400);
            }

            // 1. CAPTURAMOS DATOS
            $mime = $file->getMimeType();
            $fileSize = $file->getSize();
            $originalName = $file->getClientOriginalName() ?? 'archivo';

            // 2. VALIDACIONES
            if (!in_array($mime, self::ALLOWED_MIMES, true)) {
                return $this->json(['error' => 'Tipo de archivo no permitido'], 422);
            }

            if ($fileSize > self::MAX_SIZE) {
                return $this->json(['error' => 'El archivo supera el límite permitido'], 422);
            }

            // 3. PREPARAR DIRECTORIO
            $uploadDir = $this->getParameter('kernel.project_dir') . '/var/attachments';
            if (!is_dir($uploadDir)) {
                if (!mkdir($uploadDir, 0755, true) && !is_dir($uploadDir)) {
                    throw new \RuntimeException(sprintf('No se pudo crear el directorio: %s', $uploadDir));
                }
            }

            $extension = $file->guessExtension() ?? 'bin';
            $storedName = \Symfony\Component\Uid\Uuid::v4()->toRfc4122() . '.' . $extension;

            // 4. MOVER EL ARCHIVO
            $file->move($uploadDir, $storedName);

            // 5. CREAR ENTIDAD
            $attachment = new Attachment();
            $attachment->setIncident($incident);
            $attachment->setUploadedBy($user);
            $attachment->setOriginalName($originalName);
            $attachment->setStoredName($storedName);
            $attachment->setMimeType($mime);
            $attachment->setFileSize($fileSize);
            $attachment->setDescription($request->request->get('description'));

            $this->em->persist($attachment);
            $this->em->flush();

            return $this->json($this->serialize($attachment), 201);

        } catch (\Throwable $e) {
            $this->logger->error('Error uploading attachment: ' . $e->getMessage(), [
                'incidentId' => $incidentId,
                'trace' => $e->getTraceAsString()
            ]);
            return $this->json([
                'error' => 'Error interno al procesar el adjunto',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    // ─── 3. DOWNLOAD / VIEW ───────────────────────────────────────────────────
    #[Route('/{attachmentId}/download', name: 'download', methods: ['GET'])]
    public function download(
        string $incidentId,
        string $attachmentId,
        AttachmentRepository $attachmentRepo
    ): BinaryFileResponse|JsonResponse {
        /** @var AppUser $user */
        $user = $this->getUser();
        $incident = $this->incidentRepo->find($incidentId);
        if (!$incident) {
            return $this->json(['error' => 'Incidencia no encontrada'], 404);
        }

        $isOwner = $incident->getReportedBy()->getId() === $user->getId();
        if (!$this->isAdminOrAgent($user) && !$isOwner) {
            return $this->json(['error' => 'Sin permiso'], 403);
        }

        $attachment = $attachmentRepo->find($attachmentId);
        if (!$attachment || $attachment->getIncident()->getId() !== $incident->getId()) {
            return $this->json(['error' => 'Adjunto no encontrado'], 404);
        }

        $path = $this->getParameter('kernel.project_dir') . '/var/attachments/' . $attachment->getStoredName();
        if (!file_exists($path)) {
            return $this->json(['error' => 'Archivo no disponible en disco'], 404);
        }

        $response = new BinaryFileResponse($path);
        $response->headers->set('Content-Type', $attachment->getMimeType());
        $response->setContentDisposition(
            ResponseHeaderBag::DISPOSITION_INLINE,
            $attachment->getOriginalName()
        );

        return $response;
    }

    // ─── 4. DELETE ────────────────────────────────────────────────────────────
    #[Route('/{attachmentId}', name: 'delete', methods: ['DELETE'])]
    public function delete(
        string $incidentId,
        string $attachmentId,
        AttachmentRepository $attachmentRepo
    ): JsonResponse {
        /** @var AppUser $user */
        $user = $this->getUser();
        $attachment = $attachmentRepo->find($attachmentId);

        if (!$attachment) {
            return $this->json(['error' => 'Adjunto no encontrado'], 404);
        }

        $isOwner = $attachment->getUploadedBy()->getId() === $user->getId();
        $isAdmin = in_array('ROLE_ADMIN', $user->getRoles());

        if (!$isOwner && !$isAdmin) {
            return $this->json([
                'error' => 'No tienes permiso para borrar este archivo. Solo el propietario o un administrador pueden eliminarlo.'
            ], 403);
        }

        $path = $this->getParameter('kernel.project_dir') . '/var/attachments/' . $attachment->getStoredName();
        if (file_exists($path)) {
            unlink($path);
        }

        $this->em->remove($attachment);
        $this->em->flush();

        return $this->json(['message' => 'Adjunto eliminado correctamente']);
    }
    // ─── HELPERS ─────────────────────────────────────────────────────────────

    private function isAdminOrAgent(AppUser $user): bool
    {
        return in_array('ROLE_ADMIN', $user->getRoles()) || in_array('ROLE_AGENT', $user->getRoles());
    }

    private function serialize(Attachment $a): array
    {
        return [
            'id'           => (string) $a->getId(),
            'originalName' => $a->getOriginalName(),
            'mimeType'     => $a->getMimeType(),
            'fileSize'     => $a->getFileSize(),
            'description'  => $a->getDescription(),
            'uploadedBy'   => $a->getUploadedBy()->getName(),
            'uploadedById' => (string) $a->getUploadedBy()->getId(),
            'createdAt'    => $a->getCreatedAt()?->format('c'),
            'isImage'      => str_starts_with($a->getMimeType(), 'image/'),
        ];
    }
}
