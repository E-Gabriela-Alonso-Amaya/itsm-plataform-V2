<?php

namespace App\Controller;

use App\Repository\StatusRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;
use OpenApi\Attributes as OA;

#[Route('/api/statuses', name: 'status_')]
class StatusController extends AbstractController
{
    #[Route('', name: 'list', methods: ['GET'])]
    #[OA\Get(
        path: '/api/statuses',
        description: 'Devuelve todos los estados activos del sistema ordenados por sortOrder. Indica cuál es el estado por defecto y cuáles marcan el ticket como cerrado.',
        summary: 'Listar estados',
        security: [['bearerAuth' => []]],
        tags: ['Catálogos'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Lista de estados activos',
                content: new OA\JsonContent(
                    type: 'array',
                    items: new OA\Items(
                        properties: [
                            new OA\Property(property: 'id', type: 'integer', example: 1),
                            new OA\Property(property: 'name', type: 'string', example: 'Abierta'),
                            new OA\Property(property: 'isDefault', type: 'boolean', example: true),
                            new OA\Property(property: 'isClosed', type: 'boolean', example: false),
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
    public function list(StatusRepository $repository): JsonResponse
    {
        $statuses = $repository->findBy(
            ['isActive' => true],
            ['sortOrder' => 'ASC']
        );

        $data = array_map(fn($status) => [
            'id'        => $status->getId(),
            'name'      => $status->getName(),
            'isDefault' => $status->isDefault(),
            'isClosed'  => $status->isClosed(),
            'sortOrder' => $status->getSortOrder(),
        ], $statuses);

        return $this->json($data);
    }
}