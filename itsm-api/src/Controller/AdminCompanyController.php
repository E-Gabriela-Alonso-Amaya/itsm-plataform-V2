<?php

namespace App\Controller;

use App\Entity\Company;
use App\Repository\CompanyRepository;
use App\Repository\AuditLogRepository;
use App\Repository\CategoryRepository;
use App\Repository\PriorityRepository;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Validator\Validator\ValidatorInterface;
use OpenApi\Attributes as OA;

#[OA\Tag(name: 'Admin Companies', description: 'Gestión de empresas y configuración técnica')]
#[Route('/api/admin/companies', name: 'admin_company_')]
class AdminCompanyController extends AbstractController
{
    #[Route('', name: 'list', methods: ['GET'])]
    public function list(CompanyRepository $repo): JsonResponse
    {
        $this->denyUnlessAdmin();
        return $this->json(array_map(fn($c) => $this->serializeCompany($c), $repo->findAll()));
    }

    #[Route('', name: 'create', methods: ['POST'])]
    public function create(
        Request $request,
        EntityManagerInterface $em,
        LoggerInterface $securityLogger
    ): JsonResponse {
        $this->denyUnlessAdmin();
        $data = json_decode($request->getContent(), true);
        
        $company = new Company();
        $company->setName($data['name'] ?? 'Nueva Empresa');
        
        $em->persist($company);
        $em->flush();
        
        $securityLogger->info('[ADMIN] Empresa creada', ['id' => $company->getId(), 'name' => $company->getName()]);
        return $this->json($this->serializeCompany($company), 201);
    }

    #[Route('/history', name: 'history', methods: ['GET'])]
    public function history(Request $request, AuditLogRepository $repo): JsonResponse
    {
        $this->denyUnlessAdmin();
        $companyId = $request->query->get('companyId');

        $qb = $repo->createQueryBuilder('l')
            ->join('l.incident', 'i')
            ->join('i.company', 'c')
            ->orderBy('l.createdAt', 'DESC')
            ->setMaxResults(100);

        if ($companyId) {
            $qb->andWhere('c.id = :companyId')
               ->setParameter('companyId', $companyId);
        }

        $logs = $qb->getQuery()->getResult();

        return $this->json(array_map(fn($l) => [
            'id' => $l->getId(),
            'companyId' => (string)$l->getIncident()?->getCompany()?->getId(),
            'companyName' => $l->getIncident()?->getCompany()?->getName(),
            'incidentTitle' => $l->getIncident()?->getTitle(),
            'changedBy' => $l->getChangedBy()?->getName(),
            'field' => $l->getFieldChanged(),
            'oldValue' => $l->getOldValue(),
            'newValue' => $l->getNewValue(),
            'createdAt' => $l->getCreatedAt()?->format('d/m/Y H:i')
        ], $logs));
    }

    #[Route('/{id}', name: 'update', methods: ['PUT'])]
    public function update(
        string $id,
        Request $request,
        CompanyRepository $repo,
        EntityManagerInterface $em,
        LoggerInterface $securityLogger
    ): JsonResponse {
        $this->denyUnlessAdmin();
        $company = $repo->find($id);
        if (!$company) return $this->json(['error' => 'Empresa no encontrada'], 404);
        
        $data = json_decode($request->getContent(), true);
        if (isset($data['name'])) $company->setName($data['name']);
        
        $em->flush();
        $securityLogger->info('[ADMIN] Empresa actualizada', ['id' => $id]);
        return $this->json($this->serializeCompany($company));
    }

    #[Route('/{id}', name: 'delete', methods: ['DELETE'])]
    public function delete(
        string $id,
        CompanyRepository $repo,
        EntityManagerInterface $em,
        LoggerInterface $securityLogger
    ): JsonResponse {
        $this->denyUnlessAdmin();
        $company = $repo->find($id);
        if (!$company) return $this->json(['error' => 'Empresa no encontrada'], 404);
        
        $em->remove($company);
        $em->flush();
        $securityLogger->warning('[ADMIN] Empresa eliminada', ['id' => $id]);
        return $this->json(['message' => 'Empresa eliminada']);
    }

    private function denyUnlessAdmin(): void
    {
        if (!$this->isGranted('ROLE_ADMIN')) {
            throw $this->createAccessDeniedException('Solo administradores.');
        }
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
