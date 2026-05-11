<?php

namespace App\Controller;

use App\Entity\Company;
use App\Entity\User;
use App\Repository\CompanyRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;
use OpenApi\Attributes as OA;

#[OA\Tag(name: 'Companies', description: 'Consulta de empresas')]
#[Route('/api/companies', name: 'company_')]
class CompanyController extends AbstractController
{
    #[Route('', name: 'list', methods: ['GET'])]
    public function list(CompanyRepository $repo): JsonResponse
    {
        return $this->json(array_map(fn($c) => $this->serializeCompany($c), $repo->findAll()));
    }

    #[Route('/my', name: 'my', methods: ['GET'])]
    public function my(): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();
        if (!$user) {
            return $this->json(['error' => 'No autenticado'], 401);
        }

        // Si es admin, ve todas
        if (in_array('ROLE_ADMIN', $user->getRoles())) {
            return $this->forward('App\Controller\CompanyController::list');
        }

        // Si es agente o usuario, ve las suyas
        $companies = $user->getCompanies();
        
        return $this->json(array_map(fn($c) => $this->serializeCompany($c), $companies->toArray()));
    }

    private function serializeCompany(Company $c): array
    {
        return [
            'id' => (string)$c->getId(),
            'name' => $c->getName(),
            'createdAt' => $c->getCreatedAt()?->format('d/m/Y')
        ];
    }
}
