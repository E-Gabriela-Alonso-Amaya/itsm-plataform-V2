<?php
namespace App\Controller;
use App\Entity\Incident;
use App\Entity\User as AppUser;
use App\Entity\AuditLog;
use App\Repository\CategoryRepository;
use App\Repository\IncidentRepository;
use App\Repository\PriorityRepository;
use App\Repository\StatusRepository;
use App\Repository\UserRepository;
use App\Repository\AuditLogRepository;
use App\Repository\CompanyRepository;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Validator\Validator\ValidatorInterface;
use OpenApi\Attributes as OA;
#[OA\Tag(name: 'Incidencias', description: 'Gestión del ciclo de vida de las incidencias')]
#[Route('/api/incidents', name: 'incident_')]
class IncidentController extends AbstractController
{
    #[Route('/summary', name: 'summary', methods: ['GET'])]
    public function summary(IncidentRepository $repository, CompanyRepository $companyRepository, StatusRepository $statusRepository): JsonResponse
    {
        $user = $this->getUser();
        if (!$user) return $this->json([], 401);

        $isAdmin = in_array('ROLE_ADMIN', $user->getRoles());
        $isAgent = in_array('ROLE_AGENT', $user->getRoles());

        if (!$isAdmin && !$isAgent) {
            return $this->json([]);
        }

        $companies = $isAdmin ? $companyRepository->findAll() : $user->getCompanies();
        $summary = [];

        // Estados iniciales (Abierta)
        $initialStatuses = $statusRepository->findBy(['name' => ['Nuevo', 'Abierta']]);
        // Estados no cerrados (para el conteo de asignados)
        $activeStatuses = $statusRepository->findBy(['isClosed' => false]);

        foreach ($companies as $company) {
            // Conteo de nuevos (sin asignar y en estado inicial)
            $newCount = $repository->count([
                'company' => $company,
                'assignedTo' => null,
                'status' => $initialStatuses
            ]);

            // Conteo de asignados al usuario actual
            $assignedCount = $repository->count([
                'company' => $company,
                'assignedTo' => $user,
                'status' => $activeStatuses
            ]);

            // Conteo de mensajes no leídos (asignados al usuario o sin asignar, si es admin/agente)
            $unreadCriteria = [
                'company' => $company,
                'hasUnreadMessagesForAgent' => true,
                'status' => $activeStatuses
            ];
            if (!$isAdmin) {
                // Si no es admin, solo vemos los no leídos que están asignados a nosotros o sin asignar.
                // Doctrine no permite hacer un OR fácilmente en el array assoc de count(),
                // por lo que simplemente contaremos los no leídos asignados a nosotros.
                $unreadCriteria['assignedTo'] = $user;
            }
            $unreadCount = $repository->count($unreadCriteria);

            if ($newCount > 0 || $assignedCount > 0 || $unreadCount > 0) {
                $summary[] = [
                    'companyId' => $company->getId(),
                    'new' => $newCount,
                    'assigned' => $assignedCount,
                    'unread' => $unreadCount,
                ];
            }
        }

        return $this->json($summary);
    }

// ─── 2. QUEUE — debe ir ANTES de /{id} ───────────────────────────────────
    #[Route('/queue', name: 'queue', methods: ['GET'])]
public function queue(
        IncidentRepository $repository,
        StatusRepository $statusRepository,
        Request $request
    ): JsonResponse {
/** @var AppUser $user */
        $user = $this->getUser();
        if (!$user) {
            return $this->json(['error' => 'No autenticado'], 401);
        }
        if (!in_array('ROLE_ADMIN', $user->getRoles()) && !in_array('ROLE_AGENT', $user->getRoles())) {
            return $this->json(['error' => 'Acceso denegado'], 403);
        }
        $filterPriority = $request->query->get('priority');
        $filterCategory = $request->query->get('category');
        $filterAssigned = $request->query->get('assigned', 'all');
        $qb = $repository->createQueryBuilder('i')
            ->leftJoin('i.assignedTo', 'a')->addSelect('a')
            ->leftJoin('i.reportedBy', 'r')->addSelect('r')
            ->leftJoin('i.priority', 'p')->addSelect('p')
            ->leftJoin('i.category', 'c')->addSelect('c')
            ->leftJoin('i.status', 's')->addSelect('s');
// NO excluir tickets cerrados - mostrar el flujo completo incluyendo resueltos
if ($filterPriority) {
            $qb->andWhere('p.name = :priority')->setParameter('priority', $filterPriority);
        }
if ($filterCategory) {
            $qb->andWhere('c.name = :category')->setParameter('category', $filterCategory);
        }
if ($filterAssigned === 'me') {
            $qb->andWhere('a.id = :me')->setParameter('me', $user->getId());
        } elseif ($filterAssigned === 'unassigned') {
            $qb->andWhere('i.assignedTo IS NULL');
        }
        $qb->orderBy('p.sortOrder', 'ASC')->addOrderBy('i.createdAt', 'ASC');
        $incidents = $qb->getQuery()->getResult();
return $this->json(array_map(fn($i) => $this->serializeIncident($i), $incidents));
    }
// ─── 5. ASSIGN TO ME (agente se autoasigna) ──────────────────────────────
    #[Route('/{id}/assign', name: 'assign', methods: ['POST'])]
public function assign(
string $id,
        IncidentRepository $repository,
        StatusRepository $statusRepository,
        EntityManagerInterface $em,
        LoggerInterface $securityLogger
    ): JsonResponse {
/** @var AppUser $user */
        $user = $this->getUser();
if (!in_array('ROLE_ADMIN', $user->getRoles()) && !in_array('ROLE_AGENT', $user->getRoles())) {
return $this->json(['error' => 'Acceso denegado'], 403);
        }
        $incident = $repository->find($id);
if (!$incident) return $this->json(['error' => 'Incidencia no encontrada'], 404);
if ($incident->getAssignedTo() !== null && $incident->getAssignedTo()->getId() !== $user->getId()) {
return $this->json(['error' => 'Ya asignado a ' . $incident->getAssignedTo()->getName()], 409);
        }
// ── AUDIT LOG: leer valor viejo ANTES de cambiar ──────────
        $oldAssigned = $incident->getAssignedTo()?->getName() ?? 'Sin asignar';
// ── CAMBIAR VALORES ───────────────────────────────────────
        $incident->setAssignedTo($user);
// ── PERSISTIR LOG ─────────────────────────────────────────
        $log = new \App\Entity\AuditLog();
        $log->setIncident($incident);
        $log->setChangedBy($user);
        $log->setFieldChanged('assignedTo');
        $log->setOldValue($oldAssigned);
        $log->setNewValue($user->getName());
        $em->persist($log);
        $em->flush();
        $securityLogger->info('Ticket asignado', ['id' => $incident->getId(), 'agent' => $user->getEmail()]);
return $this->json($this->serializeIncident($incident));
    }
// ─── 6. ASSIGN TO AGENT (admin asigna a un agente concreto) ─────────────
    #[Route('/{id}/assign-to', name: 'assign_to', methods: ['POST'])]
public function assignTo(
string $id,
        Request $request,
        IncidentRepository $repository,
        UserRepository $userRepository,
        StatusRepository $statusRepository,
        EntityManagerInterface $em,
        AuditLogRepository $auditLogRepository
    ): JsonResponse {
        $isAdmin = in_array('ROLE_ADMIN', $user->getRoles());
        $isAgent = in_array('ROLE_AGENT', $user->getRoles());

        if (!$isAdmin && !$isAgent) {
            return $this->json(['error' => 'No tienes permiso para asignar tickets'], 403);
        }
        $incident = $repository->find($id);
if (!$incident) return $this->json(['error' => 'Incidencia no encontrada'], 404);
        $data    = json_decode($request->getContent(), true);
        $agentId = $data['agentId'] ?? null;
if (!$agentId) return $this->json(['error' => 'agentId es obligatorio'], 400);
        $agent = $userRepository->find($agentId);
if (!$agent || (!in_array('ROLE_AGENT', $agent->getRoles()) && !in_array('ROLE_ADMIN', $agent->getRoles()))) {
return $this->json(['error' => 'Agente no encontrado o sin permisos'], 404);
        }
        if ($isAdmin) {
            // Admin asigna directamente
            $oldAssigned = $incident->getAssignedTo()?->getName() ?? 'Sin asignar';
            $log = new \App\Entity\AuditLog();
            $log->setIncident($incident);
            $log->setChangedBy($user);
            $log->setFieldChanged('assignedTo');
            $log->setOldValue($oldAssigned);
            $log->setNewValue($agent->getName());
            $em->persist($log);

            $incident->setAssignedTo($agent);
            $incident->setPendingAssignee(null);
            $incident->setPendingAssignedAt(null);
        } else {
            // Agente asigna como pendiente
            $incident->setPendingAssignee($agent);
            $incident->setPendingAssignedAt(new \DateTimeImmutable());

            $log = new \App\Entity\AuditLog();
            $log->setIncident($incident);
            $log->setChangedBy($user);
            $log->setFieldChanged('assignedTo');
            $log->setOldValue($incident->getAssignedTo()?->getName() ?? 'Sin asignar');
            $log->setNewValue($agent->getName() . ' (Pendiente)');
            $em->persist($log);
        }
        $em->flush();
        return $this->json($this->serializeIncident($incident));
    }

    #[Route('/{id}/confirm-assignment', name: 'confirm_assignment', methods: ['POST'])]
    public function confirmAssignment(string $id, IncidentRepository $repository, EntityManagerInterface $em): JsonResponse
    {
        /** @var AppUser $user */
        $user = $this->getUser();
        $incident = $repository->find($id);
        if (!$incident) return $this->json(['error' => 'Incidencia no encontrada'], 404);

        if (!$incident->getPendingAssignee() || $incident->getPendingAssignee()->getId() !== $user->getId()) {
            return $this->json(['error' => 'No tienes una asignación pendiente para este ticket'], 403);
        }

        $oldAssigned = $incident->getAssignedTo()?->getName() ?? 'Sin asignar';
        $incident->setAssignedTo($user);
        $incident->setPendingAssignee(null);
        $incident->setPendingAssignedAt(null);

        $log = new \App\Entity\AuditLog();
        $log->setIncident($incident);
        $log->setChangedBy($user);
        $log->setFieldChanged('assignedTo');
        $log->setOldValue($oldAssigned);
        $log->setNewValue($user->getName() . ' (Confirmado)');
        $em->persist($log);

        $em->flush();
        return $this->json($this->serializeIncident($incident));
    }

    #[Route('/{id}/reject-assignment', name: 'reject_assignment', methods: ['POST'])]
    public function rejectAssignment(string $id, IncidentRepository $repository, EntityManagerInterface $em): JsonResponse
    {
        /** @var AppUser $user */
        $user = $this->getUser();
        $incident = $repository->find($id);
        if (!$incident) return $this->json(['error' => 'Incidencia no encontrada'], 404);

        if (!$incident->getPendingAssignee() || $incident->getPendingAssignee()->getId() !== $user->getId()) {
            return $this->json(['error' => 'No tienes una asignación pendiente para este ticket'], 403);
        }

        $incident->setPendingAssignee(null);
        $incident->setPendingAssignedAt(null);

        $log = new \App\Entity\AuditLog();
        $log->setIncident($incident);
        $log->setChangedBy($user);
        $log->setFieldChanged('assignedTo');
        $log->setOldValue($user->getName() . ' (Rechazado)');
        $log->setNewValue($incident->getAssignedTo()?->getName() ?? 'Sin asignar');
        $em->persist($log);

        $em->flush();
        return $this->json($this->serializeIncident($incident));
    }
// ─── 7. CHANGE STATUS (agente avanza el estado del ticket) ───────────────
    #[Route('/{id}/status', name: 'change_status', methods: ['PATCH'])]
public function changeStatus(
string $id,
        Request $request,
        IncidentRepository $repository,
        StatusRepository $statusRepository,
        EntityManagerInterface $em,
        AuditLogRepository $auditLogRepository
    ): JsonResponse {
/** @var AppUser $user */
        $user = $this->getUser();
if (!in_array('ROLE_ADMIN', $user->getRoles()) && !in_array('ROLE_AGENT', $user->getRoles())) {
return $this->json(['error' => 'Acceso denegado'], 403);
        }
        $incident = $repository->find($id);
if (!$incident) return $this->json(['error' => 'Incidencia no encontrada'], 404);
        $data       = json_decode($request->getContent(), true);
        $statusName = $data['status'] ?? null;
if (!$statusName) return $this->json(['error' => 'status es obligatorio'], 400);
        $newStatus = $statusRepository->findOneBy(['name' => $statusName]);
if (!$newStatus) return $this->json(['error' => 'Estado no encontrado'], 404);
// ── REGISTRAR CAMBIO EN AUDIT LOG ────────────────────────
        $oldStatusName = $incident->getStatus()->getName();
        $log = new \App\Entity\AuditLog();
        $log->setIncident($incident);
        $log->setChangedBy($user);
        $log->setFieldChanged('status');
        $log->setOldValue($oldStatusName);
        $log->setNewValue($statusName);
        $em->persist($log);
        $incident->setStatus($newStatus);
        
        // Si el nuevo estado es de tipo "Procesando" y no se ha iniciado, marcar empezó
        if ($statusName === 'Procesando' || $statusName === 'En progreso') {
            if ($incident->getStartedAt() === null) {
                $incident->setStartedAt(new \DateTimeImmutable());
            }
        }

        // Si el nuevo estado es "Resuelto" o "Cerrado", guardar resolvedAt ──
        if ($newStatus->isClosed() && $incident->getResolvedAt() === null) {
            $incident->setResolvedAt(new \DateTimeImmutable());
        }

        // ── Lógica de PAUSA de SLA ──
        $waitingStatusNames = ['Espera información', 'Espera info', 'Espera', 'Pendiente'];
        
        // 1. Si salimos de un estado de espera, acumulamos el tiempo pausado
        if (in_array($oldStatusName, $waitingStatusNames) && $incident->getPausedAt() !== null) {
            $now = new \DateTimeImmutable();
            $diffMs = ($now->getTimestamp() - $incident->getPausedAt()->getTimestamp()) * 1000;
            $incident->setTotalPausedMs($incident->getTotalPausedMs() + $diffMs);
            $incident->setPausedAt(null);
        }
    
        // 2. Si entramos en un estado de espera, marcamos el inicio de la pausa
        if (in_array($statusName, $waitingStatusNames)) {
            $incident->setPausedAt(new \DateTimeImmutable());
        }

        $em->flush();
        return $this->json($this->serializeIncident($incident));
    }

    #[Route('/{id}/priority', name: 'change_priority', methods: ['PATCH'])]
    public function changePriority(
        string $id,
        Request $request,
        IncidentRepository $repository,
        PriorityRepository $priorityRepository,
        EntityManagerInterface $em
    ): JsonResponse {
        /** @var AppUser $user */
        $user = $this->getUser();
        if (!in_array('ROLE_ADMIN', $user->getRoles()) && !in_array('ROLE_AGENT', $user->getRoles())) {
            return $this->json(['error' => 'Acceso denegado'], 403);
        }
        $incident = $repository->find($id);
        if (!$incident) return $this->json(['error' => 'Incidencia no encontrada'], 404);
        
        $data = json_decode($request->getContent(), true);
        $priorityId = $data['priorityId'] ?? null;
        if (!$priorityId) return $this->json(['error' => 'priorityId es obligatorio'], 400);
        
        $newPriority = $priorityRepository->find($priorityId);
        if (!$newPriority) return $this->json(['error' => 'Prioridad no encontrada'], 404);
        
        // Audit log
        $oldPriorityName = $incident->getPriority() ? $incident->getPriority()->getName() : 'Sin asignar';
        $log = new \App\Entity\AuditLog();
        $log->setIncident($incident);
        $log->setChangedBy($user);
        $log->setFieldChanged('priority');
        $log->setOldValue($oldPriorityName);
        $log->setNewValue($newPriority->getName());
        $em->persist($log);
        
        $incident->setPriority($newPriority);
        $em->flush();
        
        return $this->json($this->serializeIncident($incident));
    }

    #[Route('/{id}/rate', name: 'rate', methods: ['POST'])]
    public function rate(string $id, Request $request, IncidentRepository $repository, EntityManagerInterface $em): JsonResponse
    {
        $incident = $repository->find($id);
        if (!$incident) return $this->json(['error' => 'Incidencia no encontrada'], 404);
        
        $data = json_decode($request->getContent(), true);
        $rating = $data['rating'] ?? null;
        
        if ($rating === null || $rating < 1 || $rating > 5) {
            return $this->json(['error' => 'Valor de valoración inválido'], 400);
        }
        
        $incident->setRating($rating);
        $em->flush();
        
        return $this->json(['success' => true]);
    }
// ─── 3. SHOW ─────────────────────────────────────────────────────────────
    #[Route('/{id}', name: 'show', methods: ['GET'])]
public function show(string $id, IncidentRepository $repository): JsonResponse
    {
        $incident = $repository->find($id);
if (!$incident) return $this->json(['error' => 'Incidencia no encontrada'], 404);
/** @var AppUser $user */
        $user = $this->getUser();
if (!in_array('ROLE_ADMIN', $user->getRoles()) && !in_array('ROLE_AGENT', $user->getRoles())) {
if ($incident->getReportedBy()->getId() !== $user->getId()) {
return $this->json(['error' => 'Sin permiso'], 403);
            }
        }
return $this->json($this->serializeIncident($incident));
    }
// ─── SERIALIZER PRIVADO ───────────────────────────────────────────────────
private function serializeIncident(Incident $incident): array
    {
        $user = $this->getUser();
        $isEmployee = $user && !in_array('ROLE_ADMIN', $user->getRoles()) && !in_array('ROLE_AGENT', $user->getRoles());

        return [
            'id'            => (string) $incident->getId(),
            'title'         => $incident->getTitle(),
            'description'   => $incident->getDescription(),
            'category'      => $incident->getCategory()->getName(),
            'categoryId'    => (string) $incident->getCategory()->getId(),
            'priority'      => (!$isEmployee && $incident->getPriority()) ? $incident->getPriority()->getName() : null,
            'priorityOrder' => (!$isEmployee && $incident->getPriority()) ? $incident->getPriority()->getSortOrder() : 999,
            'status'        => $incident->getStatus()->getName(),
            'statusId'      => (string) $incident->getStatus()->getId(),
            'isClosed'      => $incident->getStatus()->isClosed(),
            'reportedBy'    => $incident->getReportedBy()->getName(),
            'reportedById'  => (string) $incident->getReportedBy()->getId(),
            'assignedTo'    => $incident->getAssignedTo() ? $incident->getAssignedTo()->getName() : null,
            'assignedToId'  => $incident->getAssignedTo() ? (string) $incident->getAssignedTo()->getId() : null,
            'createdAt'     => $incident->getCreatedAt()?->format('c'),
            'updatedAt'     => $incident->getUpdatedAt()?->format('c'),
            'startedAt'     => $incident->getStartedAt() ? $incident->getStartedAt()->format('c') : null,
            'resolvedAt'    => $incident->getResolvedAt() ? $incident->getResolvedAt()->format('c') : null,
            'slaHours'      => (!$isEmployee && $incident->getPriority()) ? $incident->getPriority()->getSlaHours() : 0,
            'pausedAt'      => $incident->getPausedAt() ? $incident->getPausedAt()->format('c') : null,
            'totalPausedMs' => $incident->getTotalPausedMs(),
            'rating'        => $incident->getRating(),
            'hasUnreadMessagesForAgent'    => $incident->hasUnreadMessagesForAgent(),
            'hasUnreadMessagesForEmployee' => $incident->hasUnreadMessagesForEmployee(),
            'pendingAssigneeId'   => $incident->getPendingAssignee() ? (string) $incident->getPendingAssignee()->getId() : null,
            'pendingAssigneeName' => $incident->getPendingAssignee() ? $incident->getPendingAssignee()->getName() : null,
            'pendingAssignedAt'   => $incident->getPendingAssignedAt() ? $incident->getPendingAssignedAt()->format('c') : null,
        ];
    }
// ─── 1. LIST ─────────────────────────────────────────────────────────────
    #[Route('', name: 'list', methods: ['GET'])]
public function list(IncidentRepository $repository, Request $request): JsonResponse
    {
/** @var AppUser $user */
        $user = $this->getUser();
        $mine = $request->query->getBoolean('mine', false);
// DEVOLVER TICKETS CREADOS POR EL USUARIO O ASIGNADOS AL USUARIO
if ($mine) {
            $incidents = $repository->createQueryBuilder('i')
                ->leftJoin('i.assignedTo', 'a')->addSelect('a')
                ->leftJoin('i.reportedBy', 'r')->addSelect('r')
                ->leftJoin('i.priority', 'p')->addSelect('p')
                ->leftJoin('i.category', 'c')->addSelect('c')
                ->leftJoin('i.status', 's')->addSelect('s')
                ->where('r = :user')
                ->setParameter('user', $user)
                ->orderBy('i.createdAt', 'DESC')
                ->getQuery()
                ->getResult();
        } else {
// ADMIN Y AGENTE VEN TODO
if (in_array('ROLE_ADMIN', $user->getRoles()) || in_array('ROLE_AGENT', $user->getRoles())) {
                $incidents = $repository->findBy([], ['createdAt' => 'DESC']);
            } else {
// EMPLEADO SOLO SUS TICKETS
                $incidents = $repository->findBy(['reportedBy' => $user], ['createdAt' => 'DESC']);
            }
        }
return $this->json(array_map(fn($i) => $this->serializeIncident($i), $incidents));
    }
// ─── 4. CREATE ───────────────────────────────────────────────────────────
    #[Route('', name: 'create', methods: ['POST'])]
public function create(
        Request $request,
        EntityManagerInterface $em,
        CategoryRepository $categoryRepository,
        PriorityRepository $priorityRepository,
        StatusRepository $statusRepository,
        ValidatorInterface $validator,
        LoggerInterface $securityLogger,
        UserRepository $userRepository
    ): JsonResponse {
        $data = json_decode($request->getContent(), true);
        
        $user = $this->getUser();
        if (!$user) {
            return $this->json(['error' => 'No autenticado'], 401);
        }

        if (empty($data['title']) || empty($data['description']) || empty($data['categoryId'])) {
            return $this->json(['error' => 'Faltan campos obligatorios'], 400);
        }

        // La prioridad es obligatoria para agentes/admins, pero para empleados la asignaremos por defecto
        $isEmployee = in_array('ROLE_USER', $user->getRoles());

        if (!$isEmployee && empty($data['priorityId'])) {
            return $this->json(['error' => 'La prioridad es obligatoria'], 400);
        }

        $category = $categoryRepository->find($data['categoryId']);
        $status = $statusRepository->findOneBy(['isDefault' => true]);
        $priority = null;
        if (!empty($data['priorityId'])) {
            $priority = $priorityRepository->find($data['priorityId']);
        } elseif ($isEmployee) {
            $priority = $priorityRepository->findOneBy(['name' => 'Baja'])
                ?? $priorityRepository->findOneBy([]);
        }

        if (!$category || !$status) {
            return $this->json(['error' => 'Categoría o estado no encontrado'], 404);
        }

        if (!$category->getCompany()) {
            return $this->json(['error' => 'La categoría seleccionada no está asociada a ninguna empresa'], 400);
        }
        
        // Si no es empleado y no se encontró la prioridad, error
        if (!$isEmployee && !$priority) {
             return $this->json(['error' => 'Prioridad no encontrada'], 404);
        }

        $incident = new Incident();
        $incident->setTitle($data['title']);
        $incident->setDescription($data['description']);
        $incident->setCategory($category);
        $incident->setPriority($priority);
        $incident->setStatus($status);
        $incident->setReportedBy($user);
        $incident->setCompany($category->getCompany());
// Asignación al crear
if (in_array('ROLE_AGENT', $this->getUser()->getRoles()) && !empty($data['assignToMe'])) {
            $incident->setAssignedTo($this->getUser());
        }
// Admin puede asignar a agente al crear
if (in_array('ROLE_ADMIN', $this->getUser()->getRoles())) {
if (!empty($data['assignToMe'])) {
                $incident->setAssignedTo($this->getUser());
            } elseif (!empty($data['assignedToId'])) {
                $agent = $userRepository->find($data['assignedToId']);
if ($agent) {
                    $incident->setAssignedTo($agent);
                }
            }
        }
        $errors = $validator->validate($incident);
if (count($errors) > 0) {
return $this->json(['errors' => array_map(fn($e) => $e->getMessage(), iterator_to_array($errors))], 422);
        }
        $em->persist($incident);
// ── REGISTRAR CREACIÓN EN AUDIT LOG ──────────────────────
        $logCreacion = new \App\Entity\AuditLog();
        $logCreacion->setIncident($incident);
        $logCreacion->setChangedBy($this->getUser());
        $logCreacion->setFieldChanged('status');
        $logCreacion->setOldValue(null);
        $logCreacion->setNewValue($status->getName());
        $em->persist($logCreacion);
// Si se asignó al crear, registrar también la asignación
if ($incident->getAssignedTo() !== null) {
            $logAsignacion = new \App\Entity\AuditLog();
            $logAsignacion->setIncident($incident);
            $logAsignacion->setChangedBy($this->getUser());
            $logAsignacion->setFieldChanged('assignedTo');
            $logAsignacion->setOldValue('Sin asignar');
            $logAsignacion->setNewValue($incident->getAssignedTo()->getName());
            $em->persist($logAsignacion);
        }
        $em->flush();
        $securityLogger->info('Incident creado', ['id' => $incident->getId(), 'title' => $incident->getTitle()]);
return $this->json($this->serializeIncident($incident), 201);
    }
    #[Route('/{id}/history', name: 'history', methods: ['GET'])]
public function history(
string $id,
        IncidentRepository $repository,
        AuditLogRepository $auditLogRepository
    ): JsonResponse {
        $user = $this->getUser();
        if (!$user) {
            return $this->json(['error' => 'No autenticado'], 401);
        }
        if (!in_array('ROLE_ADMIN', $user->getRoles()) && !in_array('ROLE_AGENT', $user->getRoles())) {
            return $this->json(['error' => 'Acceso denegado'], 403);
        }
        $incident = $repository->find($id);
if (!$incident) return $this->json(['error' => 'No encontrada'], 404);
        $logs = $auditLogRepository->findBy(
            ['incident' => $incident],
            ['createdAt' => 'ASC']
        );
    return $this->json(array_map(fn($log) => [
        'id'           => (string) $log->getId(),
        'fieldChanged' => $log->getFieldChanged(),
        'oldValue'     => $log->getOldValue(),
        'newValue'     => $log->getNewValue(),
        'changedBy'    => $log->getChangedBy()?->getName() ?? 'Sistema',
        'createdAt'    => $log->getCreatedAt()?->format('c'),
    ], $logs));
    }
}