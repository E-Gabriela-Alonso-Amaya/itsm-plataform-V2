<?php

namespace App\Controller;

use App\Entity\Comment;
use App\Repository\CommentRepository;
use App\Repository\IncidentRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use OpenApi\Attributes as OA;

#[OA\Tag(name: 'Comentarios', description: 'Conversación por ticket')]
#[Route('/api/incidents/{incidentId}/comments', name: 'comment_')]
class CommentController extends AbstractController
{
    #[Route('', name: 'list', methods: ['GET'])]
    public function list(
        string $incidentId,
        IncidentRepository $incidentRepo,
        CommentRepository $commentRepo,
        EntityManagerInterface $em
    ): JsonResponse {
        $incident = $incidentRepo->find($incidentId);
        if (!$incident) {
            return $this->json(['error' => 'Incidencia no encontrada'], 404);
        }

        /** @var \App\Entity\User $user */
        $user = $this->getUser();
        
        // ROLE_USER solo puede ver comentarios de sus propias incidencias
        if (!in_array('ROLE_ADMIN', $user->getRoles()) && !in_array('ROLE_AGENT', $user->getRoles())) {
            if ($incident->getReportedBy()->getId() !== $user->getId()) {
                return $this->json(['error' => 'Sin permiso'], 403);
            }
        }

        $comments = $commentRepo->findBy(
            ['incident' => $incident],
            ['createdAt' => 'ASC']
        );

        $isAgentOrAdmin = in_array('ROLE_ADMIN', $user->getRoles()) || in_array('ROLE_AGENT', $user->getRoles());
        
        $changed = false;
        if ($isAgentOrAdmin && $incident->hasUnreadMessagesForAgent()) {
            $incident->setHasUnreadMessagesForAgent(false);
            $changed = true;
        } elseif (!$isAgentOrAdmin && $incident->hasUnreadMessagesForEmployee()) {
            $incident->setHasUnreadMessagesForEmployee(false);
            $changed = true;
        }

        if ($changed) {
            $em->persist($incident);
            $em->flush();
        }

        $data = array_map(fn($c) => [
            'id'         => (string) $c->getId(),
            'content'    => $c->getContent(),
            'authorId'   => (string) $c->getAuthor()->getId(),
            'authorName' => $c->getAuthor()->getName(),
            'createdAt'  => $c->getCreatedAt()?->format('c'),
        ], $comments);

        return $this->json($data);
    }

    #[Route('', name: 'create', methods: ['POST'])]
    public function create(
        string $incidentId,
        Request $request,
        IncidentRepository $incidentRepo,
        \App\Repository\StatusRepository $statusRepository,
        EntityManagerInterface $em
    ): JsonResponse {
        $incident = $incidentRepo->find($incidentId);
        if (!$incident) {
            return $this->json(['error' => 'Incidencia no encontrada'], 404);
        }

        /** @var \App\Entity\User $user */
        $user = $this->getUser();

        // ROLE_USER solo puede comentar sus propias incidencias
        $isAgentOrAdmin = in_array('ROLE_ADMIN', $user->getRoles()) || in_array('ROLE_AGENT', $user->getRoles());
        if (!$isAgentOrAdmin) {
            if ($incident->getReportedBy()->getId() !== $user->getId()) {
                return $this->json(['error' => 'Sin permiso'], 403);
            }
        }

        $data = json_decode($request->getContent(), true);
        if (empty($data['content'])) {
            return $this->json(['error' => 'El contenido no puede estar vacío'], 400);
        }

        $comment = new Comment();
        $comment->setContent($data['content']);
        $comment->setAuthor($user);
        $comment->setIncident($incident);

        $em->persist($comment);

        // Si se comenta (tanto técnico como empleado), el ticket pasa a estado 'Espera info' y pausa el temporizador SLA
        if ($isAgentOrAdmin) {
            $incident->setHasUnreadMessagesForEmployee(true);
            $incident->setHasUnreadMessagesForAgent(false);
        } else {
            $incident->setHasUnreadMessagesForAgent(true);
            $incident->setHasUnreadMessagesForEmployee(false);
        }

        $oldStatus = $incident->getStatus();
        $oldStatusName = $oldStatus->getName();
        $waitingStatusNames = ['Espera información', 'Espera info', 'Espera', 'Pendiente'];

        $statusChanged = false;
        if (!in_array($oldStatusName, $waitingStatusNames) && !$oldStatus->isClosed()) {
            // Buscar el estado 'Espera info'; crearlo si no existe (auto-heal)
            $newStatus = $statusRepository->findOneBy(['name' => 'Espera info']);
            if (!$newStatus) {
                $newStatus = new \App\Entity\Status();
                $newStatus->setName('Espera info')
                          ->setIsDefault(false)
                          ->setIsClosed(false)
                          ->setSortOrder(4)
                          ->setIsActive(true);
                $em->persist($newStatus);
            }

            $log = new \App\Entity\AuditLog();
            $log->setIncident($incident);
            $log->setChangedBy($user);
            $log->setFieldChanged('status');
            $log->setOldValue($oldStatusName);
            $log->setNewValue($newStatus->getName());
            $em->persist($log);

            $incident->setStatus($newStatus);
            $incident->setPausedAt(new \DateTimeImmutable());
            $statusChanged = true;
        }

        $em->flush();

        return $this->json([
            'id'         => (string) $comment->getId(),
            'content'    => $comment->getContent(),
            'authorId'   => (string) $comment->getAuthor()->getId(),
            'authorName' => $comment->getAuthor()->getName(),
            'createdAt'  => $comment->getCreatedAt()?->format('c'),
            'incidentStatus' => $incident->getStatus()->getName(),
            'statusChanged'  => $statusChanged,
        ], 201);
    }
}