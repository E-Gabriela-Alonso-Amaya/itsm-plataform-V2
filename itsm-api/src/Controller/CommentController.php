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
        CommentRepository $commentRepo
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

        $data = array_map(fn($c) => [
            'id'         => $c->getId(),
            'content'    => $c->getContent(),
            'authorId'   => $c->getAuthor()->getId(),
            'authorName' => $c->getAuthor()->getName(),
            'createdAt'  => $c->getCreatedAt()?->format('d/m/Y H:i'),
        ], $comments);

        return $this->json($data);
    }

    #[Route('', name: 'create', methods: ['POST'])]
    public function create(
        string $incidentId,
        Request $request,
        IncidentRepository $incidentRepo,
        EntityManagerInterface $em
    ): JsonResponse {
        $incident = $incidentRepo->find($incidentId);
        if (!$incident) {
            return $this->json(['error' => 'Incidencia no encontrada'], 404);
        }

        /** @var \App\Entity\User $user */
        $user = $this->getUser();

        // ROLE_USER solo puede comentar sus propias incidencias
        if (!in_array('ROLE_ADMIN', $user->getRoles()) && !in_array('ROLE_AGENT', $user->getRoles())) {
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
        $em->flush();

        return $this->json([
            'id'         => $comment->getId(),
            'content'    => $comment->getContent(),
            'authorId'   => $comment->getAuthor()->getId(),
            'authorName' => $comment->getAuthor()->getName(),
            'createdAt'  => $comment->getCreatedAt()?->format('d/m/Y H:i'),
        ], 201);
    }
}