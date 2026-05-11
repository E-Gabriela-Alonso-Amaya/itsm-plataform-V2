<?php

namespace App\Controller;

use App\Repository\CategoryRepository; //importar el repositorio para hacer las consultas a la BD de categoría
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse; //importar el repositorio Json para que las respuestas sean en formato JSON (API->JSON)
use Symfony\Component\Routing\Attribute\Route;
use OpenApi\Attributes as OA;

#[OA\Tag(name: 'Catálogos', description: 'Listas de referencia del sistema: categorías, prioridades y estados')]
#[Route('/api/categories', name: 'category_')] //definir la ruta del controlador y renombrarla
class CategoryController extends AbstractController //quitamos que la clase sea final porque limita su extensibilidad
{
    #[Route('', name: 'list', methods: ['GET'])]
    #[OA\Get(
        path: '/api/categories',
        description: 'Devuelve todas las categorías activas ordenadas por sortOrder. Requiere autenticación.',
        summary: 'Listar categorías',
        security: [['bearerAuth' => []]],
        tags: ['Catálogos'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Lista de categorías activas',
                content: new OA\JsonContent(
                    type: 'array',
                    items: new OA\Items(
                        properties: [
                            new OA\Property(property: 'id', type: 'integer', example: 1),
                            new OA\Property(property: 'name', type: 'string', example: 'Hardware'),
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
    public function list(CategoryRepository $repository): JsonResponse
    {
        $user = $this->getUser();
        $categories = $repository->findBy(['isActive' => true], ['sortOrder' => 'ASC']);

        if ($user && !in_array('ROLE_ADMIN', $user->getRoles())) {
            $userCompanies = $user->getCompanies();
            $userCategories = $user->getCategories();
            $isAgent = in_array('ROLE_AGENT', $user->getRoles());

            $categories = array_filter($categories, function($cat) use ($userCompanies, $userCategories, $isAgent) {
                // Si la categoría no tiene empresa vinculada, es global (visible para todos)
                if (!$cat->getCompany()) return true;
                
                // El usuario debe pertenecer a la empresa de la categoría para verla
                if (!$userCompanies->contains($cat->getCompany())) {
                    return false;
                }

                // Si es un agente, solo ve las categorías que tiene asignadas explícitamente
                if ($isAgent) {
                    return $userCategories->contains($cat);
                }

                // Si es un empleado (u otro rol), ve todas las categorías de su empresa
                return true;
            });
            // Reindexar el array después del filtro
            $categories = array_values($categories);
        }

        $data = array_map(fn($category) => [
            'id'          => $category->getId(),
            'name'        => $category->getName(),
            'sortOrder'   => $category->getSortOrder(),
            'companyId'   => $category->getCompany() ? (string)$category->getCompany()->getId() : null,
            'companyName' => $category->getCompany()?->getName(),
        ], $categories);

        return $this->json($data);
    }
}