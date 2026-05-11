<?php

namespace App\Controller;

use App\Entity\User;
use App\Repository\IncidentRepository;
use App\Repository\UserRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;
use OpenApi\Attributes as OA;

#[OA\Tag(name: 'Estadísticas', description: 'Métricas de rendimiento para agentes y administradores')]
#[Route('/api/stats', name: 'stats_')]
class IncidentStatsController extends AbstractController
{
    #[Route('', name: 'index', methods: ['GET'])]
    public function index(IncidentRepository $incidentRepository, UserRepository $userRepository): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();
        $roles = $user->getRoles();

        if (in_array('ROLE_ADMIN', $roles)) {
            return $this->getAdminStats($incidentRepository, $userRepository);
        }

        if (in_array('ROLE_AGENT', $roles)) {
            return $this->getAgentStats($incidentRepository, $user);
        }

        return $this->json(['error' => 'No tienes permisos para ver estadísticas'], 403);
    }

    private function getAgentStats(IncidentRepository $repository, User $agent): JsonResponse
    {
        $allAssigned = $repository->findBy(['assignedTo' => $agent]);
        $closed = array_filter($allAssigned, fn($i) => $i->getStatus()->isClosed());
        
        $slaCompliant = 0;
        $totalResolutionTime = 0;
        
        foreach ($closed as $incident) {
            $createdAt = $incident->getCreatedAt();
            $resolvedAt = $incident->getResolvedAt();
            
            if ($createdAt && $resolvedAt) {
                $diff = $resolvedAt->getTimestamp() - $createdAt->getTimestamp();
                $hours = $diff / 3600;
                $totalResolutionTime += $hours;
                
                $slaLimit = $incident->getPriority()->getSlaHours();
                if ($slaLimit === null || $hours <= $slaLimit) {
                    $slaCompliant++;
                }
            }
        }

        return $this->json([
            'totalAssigned' => count($allAssigned),
            'closedTickets' => count($closed),
            'slaComplianceRate' => count($closed) > 0 ? round(($slaCompliant / count($closed)) * 100, 1) : 100,
            'avgResolutionTime' => count($closed) > 0 ? round($totalResolutionTime / count($closed), 1) : 0,
        ]);
    }

    private function getAdminStats(IncidentRepository $repository, UserRepository $userRepository): JsonResponse
    {
        $all = $repository->findAll();
        $agents = $userRepository->createQueryBuilder('u')
            ->where('u.roles LIKE :role_agent')
            ->orWhere('u.roles LIKE :role_admin')
            ->setParameter('role_agent', '%ROLE_AGENT%')
            ->setParameter('role_admin', '%ROLE_ADMIN%')
            ->getQuery()
            ->getResult();

        $agentPerformance = [];
        foreach ($agents as $agent) {
            $assigned = $repository->findBy(['assignedTo' => $agent]);
            $closed = array_filter($assigned, fn($i) => $i->getStatus()->isClosed());
            
            $agentPerformance[] = [
                'id' => $agent->getId(),
                'name' => $agent->getName(),
                'assigned' => count($assigned),
                'closed' => count($closed),
                'performance' => count($assigned) > 0 ? round((count($closed) / count($assigned)) * 100, 1) : 0
            ];
        }

        // Tiempos medios
        $closedAll = array_filter($all, fn($i) => $i->getStatus()->isClosed());
        $totalTime = 0;
        foreach ($closedAll as $i) {
            if ($i->getCreatedAt() && $i->getResolvedAt()) {
                $totalTime += ($i->getResolvedAt()->getTimestamp() - $i->getCreatedAt()->getTimestamp()) / 3600;
            }
        }

        return $this->json([
            'totalTickets' => count($all),
            'avgGlobalResolutionTime' => count($closedAll) > 0 ? round($totalTime / count($closedAll), 1) : 0,
            'agentPerformance' => $agentPerformance,
            'statusDistribution' => $this->getStatusDistribution($all)
        ]);
    }

    private function getStatusDistribution(array $incidents): array
    {
        $dist = [];
        foreach ($incidents as $i) {
            $status = $i->getStatus()->getName();
            $dist[$status] = ($dist[$status] ?? 0) + 1;
        }
        return $dist;
    }
}
