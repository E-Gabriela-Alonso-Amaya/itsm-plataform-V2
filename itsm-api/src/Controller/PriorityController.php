<?php

namespace App\Controller;

use App\Repository\PriorityRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;
use OpenApi\Attributes as OA;

#[Route('/api/priorities', name: 'priority_')]
class PriorityController extends AbstractController
{
    #[Route('', name: 'list', methods: ['GET'])]
    #[OA\Get(
        path: '/api/priorities',
        description: 'Devuelve todas las prioridades activas ordenadas por sortOrder. Incluye las horas de SLA asociadas.',
        summary: 'Listar prioridades',
        security: [['bearerAuth' => []]],
        tags: ['Catálogos'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Lista de prioridades activas',
                content: new OA\JsonContent(
                    type: 'array',
                    items: new OA\Items(
                        properties: [
                            new OA\Property(property: 'id', type: 'integer', example: 1),
                            new OA\Property(property: 'name', type: 'string', example: 'Crítica'),
                            new OA\Property(property: 'slaHours', type: 'integer', nullable: true, example: 4),
                            new OA\Property(property: 'sortOrder', type: 'integer', example: 1),
                        ]
                    )
                )
            ),
            new OA\Response(
                response: 401,
                description: 'Token ausente o inválido',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'error', type: 'string', example: 'Unauthorized'),
                    ]
                )
            ),
        ]
    )]
    public function list(PriorityRepository $repository): JsonResponse
    {
        $user = $this->getUser();
        $priorities = $repository->findBy(['isActive' => true], ['sortOrder' => 'ASC']);

        if ($user && !in_array('ROLE_ADMIN', $user->getRoles())) {
            $userCompanies = $user->getCompanies();
            $priorities = array_filter($priorities, function($p) use ($userCompanies) {
                if (!$p->getCompany()) return true;
                return $userCompanies->contains($p->getCompany());
            });
            $priorities = array_values($priorities);
        }

        $data = array_map(fn($priority) => [
            'id'          => $priority->getId(),
            'name'        => $priority->getName(),
            'slaHours'    => $priority->getSlaHours(),
            'sortOrder'   => $priority->getSortOrder(),
            'companyId'   => $priority->getCompany() ? (string)$priority->getCompany()->getId() : null,
            'companyName' => $priority->getCompany()?->getName(),
        ], $priorities);

        return $this->json($data);
    }
}