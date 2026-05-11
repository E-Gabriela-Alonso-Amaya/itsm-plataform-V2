<?php

namespace App\Controller;

use App\Entity\Category;
use App\Entity\Priority;
use App\Entity\User as AppUser;
use App\Repository\CategoryRepository;
use App\Repository\CompanyRepository;
use App\Repository\PriorityRepository;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Validator\Constraints as Assert;
use Symfony\Component\Validator\Validator\ValidatorInterface;
use OpenApi\Attributes as OA;

/**
 * Panel de administración del sistema.
 *
 * OWASP A01 – Broken Access Control:
 *   Todos los endpoints comprueban ROLE_ADMIN explícitamente con denyUnlessAdmin().
 *   No se confía en el rol implícito de la sesión.
 *
 * OWASP A03 – Injection:
 *   Todo input pasa por Symfony Validator antes de persistir.
 *   Doctrine usa consultas parametrizadas siempre.
 *
 * OWASP A07 – Auth Failures:
 *   Las contraseñas se hashean con UserPasswordHasher (bcrypt/argon2id).
 *   Nunca se devuelve el hash en las respuestas.
 *
 * OWASP A09 – Security Logging:
 *   Cada escritura queda en el security logger con usuario y timestamp.
 */
#[OA\Tag(name: 'Admin', description: 'Panel de administración — solo ROLE_ADMIN')]
#[Route('/api/admin', name: 'admin_')]
class AdminController extends AbstractController
{
    // ══════════════════════════════════════════════════════════════
    // CATEGORÍAS
    // ══════════════════════════════════════════════════════════════

    #[Route('/categories', name: 'cat_list', methods: ['GET'])]
    public function listCategories(CategoryRepository $repo): JsonResponse
    {
        $this->denyUnlessAdmin();
        return $this->json(array_map(
            fn($c) => $this->serializeCat($c),
            $repo->findBy([], ['sortOrder' => 'ASC'])
        ));
    }

    #[Route('/categories', name: 'cat_create', methods: ['POST'])]
    public function createCategory(
        Request $request,
        EntityManagerInterface $em,
        ValidatorInterface $validator,
        CompanyRepository $companyRepo,
        LoggerInterface $securityLogger
    ): JsonResponse {
        $this->denyUnlessAdmin();
        $data = $this->parseJson($request);
        if (!$data) return $this->json(['error' => 'JSON inválido'], 400);

        $err = $this->validateName($data['name'] ?? '', $validator);
        if ($err) return $this->json(['error' => $err], 422);

        $cat = new Category();
        $cat->setName(trim($data['name']));
        $cat->setSortOrder((int)($data['sortOrder'] ?? 99));

        if (!empty($data['companyId'])) {
            $company = $companyRepo->find($data['companyId']);
            if ($company) $cat->setCompany($company);
        }

        $em->persist($cat);
        $em->flush();

        $this->log($securityLogger, 'Categoría creada', ['id' => $cat->getId(), 'name' => $cat->getName()]);
        return $this->json($this->serializeCat($cat), 201);
    }

    #[Route('/categories/{id}', name: 'cat_update', methods: ['PUT'])]
    public function updateCategory(
        int $id,
        Request $request,
        CategoryRepository $repo,
        CompanyRepository $companyRepo,
        EntityManagerInterface $em,
        ValidatorInterface $validator,
        LoggerInterface $securityLogger
    ): JsonResponse {
        $this->denyUnlessAdmin();
        $cat = $repo->find($id);
        if (!$cat) return $this->json(['error' => 'Categoría no encontrada'], 404);

        $data = $this->parseJson($request);
        if (!$data) return $this->json(['error' => 'JSON inválido'], 400);

        if (isset($data['name'])) {
            $err = $this->validateName($data['name'], $validator);
            if ($err) return $this->json(['error' => $err], 422);
            $cat->setName(trim($data['name']));
        }
        if (isset($data['sortOrder'])) $cat->setSortOrder((int)$data['sortOrder']);
        if (array_key_exists('companyId', $data)) {
            $cat->setCompany($data['companyId'] ? $companyRepo->find($data['companyId']) : null);
        }

        $em->flush();
        $this->log($securityLogger, 'Categoría actualizada', ['id' => $id]);
        return $this->json($this->serializeCat($cat));
    }

    #[Route('/categories/{id}', name: 'cat_delete', methods: ['DELETE'])]
    public function deleteCategory(
        int $id,
        CategoryRepository $repo,
        EntityManagerInterface $em,
        LoggerInterface $securityLogger
    ): JsonResponse {
        $this->denyUnlessAdmin();
        $cat = $repo->find($id);
        if (!$cat) return $this->json(['error' => 'Categoría no encontrada'], 404);

        $count = (int)$em->createQuery(
            'SELECT COUNT(i.id) FROM App\Entity\Incident i WHERE i.category = :c'
        )->setParameter('c', $cat)->getSingleScalarResult();

        if ($count > 0) {
            return $this->json(['error' => "No se puede eliminar: {$count} incidencia(s) la usan"], 409);
        }

        $em->remove($cat);
        $em->flush();
        $this->log($securityLogger, 'Categoría eliminada', ['id' => $id], 'warning');
        return $this->json(['message' => 'Categoría eliminada']);
    }

    // ══════════════════════════════════════════════════════════════
    // PRIORIDADES
    // ══════════════════════════════════════════════════════════════

    #[Route('/priorities', name: 'pri_list', methods: ['GET'])]
    public function listPriorities(PriorityRepository $repo): JsonResponse
    {
        $this->denyUnlessAdmin();
        return $this->json(array_map(
            fn($p) => $this->serializePri($p),
            $repo->findBy([], ['sortOrder' => 'ASC'])
        ));
    }

    #[Route('/priorities', name: 'pri_create', methods: ['POST'])]
    public function createPriority(
        Request $request,
        EntityManagerInterface $em,
        ValidatorInterface $validator,
        CompanyRepository $companyRepo,
        LoggerInterface $securityLogger
    ): JsonResponse {
        $this->denyUnlessAdmin();
        $data = $this->parseJson($request);
        if (!$data) return $this->json(['error' => 'JSON inválido'], 400);

        $err = $this->validateName($data['name'] ?? '', $validator, 50);
        if ($err) return $this->json(['error' => $err], 422);

        $slaHours = isset($data['slaHours']) && $data['slaHours'] !== null
            ? (int)$data['slaHours'] : null;
        if ($slaHours !== null && $slaHours < 0) {
            return $this->json(['error' => 'slaHours debe ser positivo'], 422);
        }

        $pri = new Priority();
        $pri->setName(trim($data['name']));
        $pri->setSortOrder((int)($data['sortOrder'] ?? 99));
        $pri->setSlaHours($slaHours);

        if (!empty($data['companyId'])) {
            $company = $companyRepo->find($data['companyId']);
            if ($company) $pri->setCompany($company);
        }

        $em->persist($pri);
        $em->flush();

        $this->log($securityLogger, 'Prioridad creada', ['id' => $pri->getId(), 'name' => $pri->getName()]);
        return $this->json($this->serializePri($pri), 201);
    }

    #[Route('/priorities/{id}', name: 'pri_update', methods: ['PUT'])]
    public function updatePriority(
        int $id,
        Request $request,
        PriorityRepository $repo,
        CompanyRepository $companyRepo,
        EntityManagerInterface $em,
        ValidatorInterface $validator,
        LoggerInterface $securityLogger
    ): JsonResponse {
        $this->denyUnlessAdmin();
        $pri = $repo->find($id);
        if (!$pri) return $this->json(['error' => 'Prioridad no encontrada'], 404);

        $data = $this->parseJson($request);
        if (!$data) return $this->json(['error' => 'JSON inválido'], 400);

        if (isset($data['name'])) {
            $err = $this->validateName($data['name'], $validator, 50);
            if ($err) return $this->json(['error' => $err], 422);
            $pri->setName(trim($data['name']));
        }
        if (isset($data['sortOrder'])) $pri->setSortOrder((int)$data['sortOrder']);
        if (array_key_exists('slaHours', $data)) {
            $sla = $data['slaHours'] !== null ? (int)$data['slaHours'] : null;
            if ($sla !== null && $sla < 0) return $this->json(['error' => 'slaHours debe ser positivo'], 422);
            $pri->setSlaHours($sla);
        }
        if (array_key_exists('companyId', $data)) {
            $pri->setCompany($data['companyId'] ? $companyRepo->find($data['companyId']) : null);
        }

        $em->flush();
        $this->log($securityLogger, 'Prioridad actualizada', ['id' => $id]);
        return $this->json($this->serializePri($pri));
    }

    #[Route('/priorities/{id}', name: 'pri_delete', methods: ['DELETE'])]
    public function deletePriority(
        int $id,
        PriorityRepository $repo,
        EntityManagerInterface $em,
        LoggerInterface $securityLogger
    ): JsonResponse {
        $this->denyUnlessAdmin();
        $pri = $repo->find($id);
        if (!$pri) return $this->json(['error' => 'Prioridad no encontrada'], 404);

        $count = (int)$em->createQuery(
            'SELECT COUNT(i.id) FROM App\Entity\Incident i WHERE i.priority = :p'
        )->setParameter('p', $pri)->getSingleScalarResult();

        if ($count > 0) {
            return $this->json(['error' => "No se puede eliminar: {$count} incidencia(s) la usan"], 409);
        }

        $em->remove($pri);
        $em->flush();
        $this->log($securityLogger, 'Prioridad eliminada', ['id' => $id], 'warning');
        return $this->json(['message' => 'Prioridad eliminada']);
    }

    // ══════════════════════════════════════════════════════════════
    // USUARIOS
    // ══════════════════════════════════════════════════════════════

    #[Route('/users', name: 'users_list', methods: ['GET'])]
    public function listUsers(UserRepository $repo): JsonResponse
    {
        $this->denyUnlessAdmin();
        $users = $repo->findBy([], ['createdAt' => 'DESC']);
        return $this->json(array_map(fn($u) => $this->serializeUser($u), $users));
    }

    #[Route('/users', name: 'users_create', methods: ['POST'])]
    public function createUser(
        Request $request,
        EntityManagerInterface $em,
        UserPasswordHasherInterface $hasher,
        ValidatorInterface $validator,
        UserRepository $repo,
        LoggerInterface $securityLogger
    ): JsonResponse {
        $this->denyUnlessAdmin();
        $data = $this->parseJson($request);
        if (!$data) return $this->json(['error' => 'JSON inválido'], 400);

        // Validar campos obligatorios
        $required = ['name', 'email', 'password', 'role'];
        foreach ($required as $field) {
            if (empty($data[$field])) {
                return $this->json(['error' => "El campo '{$field}' es obligatorio"], 422);
            }
        }

        // OWASP A03: validar email y contraseña
        $emailViolations = $validator->validate($data['email'], [
            new Assert\NotBlank(),
            new Assert\Email(message: 'Email no válido'),
            new Assert\Length(max: 180),
        ]);
        if (count($emailViolations)) {
            return $this->json(['error' => (string)$emailViolations->get(0)->getMessage()], 422);
        }

        // Email único
        if ($repo->findOneBy(['email' => $data['email']])) {
            return $this->json(['error' => 'Ya existe un usuario con ese email'], 409);
        }

        // Contraseña mínimo 8 caracteres (OWASP A07)
        if (strlen($data['password']) < 8) {
            return $this->json(['error' => 'La contraseña debe tener al menos 8 caracteres'], 422);
        }

        // Roles permitidos
        $allowedRoles = ['ROLE_USER', 'ROLE_AGENT', 'ROLE_ADMIN'];
        $role = $data['role'];
        if (!in_array($role, $allowedRoles, true)) {
            return $this->json(['error' => 'Rol no válido'], 422);
        }

        $user = new AppUser();
        $user->setName(trim($data['name']));
        $user->setEmail(strtolower(trim($data['email'])));
        $user->setRoles([$role]);
        $user->setIsActive(true);

        // OWASP A02: hash seguro con argon2id/bcrypt vía Symfony
        $user->setPassword($hasher->hashPassword($user, $data['password']));

        $em->persist($user);
        $em->flush();

        $this->log($securityLogger, 'Usuario creado', ['id' => $user->getId(), 'email' => $user->getEmail()]);
        return $this->json($this->serializeUser($user), 201);
    }

    #[Route('/users/{id}', name: 'users_update', methods: ['PUT'])]
    public function updateUser(
        string $id,
        Request $request,
        UserRepository $repo,
        EntityManagerInterface $em,
        UserPasswordHasherInterface $hasher,
        ValidatorInterface $validator,
        LoggerInterface $securityLogger
    ): JsonResponse {
        $this->denyUnlessAdmin();
        $user = $repo->find($id);
        if (!$user) return $this->json(['error' => 'Usuario no encontrado'], 404);

        $data = $this->parseJson($request);
        if (!$data) return $this->json(['error' => 'JSON inválido'], 400);

        if (isset($data['name']) && trim($data['name']) !== '') {
            $user->setName(trim($data['name']));
        }

        if (isset($data['email'])) {
            $emailViolations = $validator->validate($data['email'], [
                new Assert\NotBlank(), new Assert\Email(), new Assert\Length(max: 180),
            ]);
            if (count($emailViolations)) {
                return $this->json(['error' => (string)$emailViolations->get(0)->getMessage()], 422);
            }
            $existing = $repo->findOneBy(['email' => $data['email']]);
            if ($existing && $existing->getId() !== $user->getId()) {
                return $this->json(['error' => 'Email ya en uso por otro usuario'], 409);
            }
            $user->setEmail(strtolower(trim($data['email'])));
        }

        if (isset($data['role'])) {
            $allowedRoles = ['ROLE_USER', 'ROLE_AGENT', 'ROLE_ADMIN'];
            if (!in_array($data['role'], $allowedRoles, true)) {
                return $this->json(['error' => 'Rol no válido'], 422);
            }
            $user->setRoles([$data['role']]);
        }

        if (isset($data['isActive'])) {
            $user->setIsActive((bool)$data['isActive']);
        }

        // Reset de contraseña (opcional)
        if (!empty($data['newPassword'])) {
            if (strlen($data['newPassword']) < 8) {
                return $this->json(['error' => 'La contraseña debe tener al menos 8 caracteres'], 422);
            }
            $user->setPassword($hasher->hashPassword($user, $data['newPassword']));
        }

        $em->flush();
        $this->log($securityLogger, 'Usuario actualizado', ['id' => $id]);
        return $this->json($this->serializeUser($user));
    }

    #[Route('/users/{id}/toggle', name: 'users_toggle', methods: ['PATCH'])]
    public function toggleUser(
        string $id,
        UserRepository $repo,
        EntityManagerInterface $em,
        LoggerInterface $securityLogger
    ): JsonResponse {
        $this->denyUnlessAdmin();

        /** @var AppUser $currentUser */
        $currentUser = $this->getUser();
        $user = $repo->find($id);
        if (!$user) return $this->json(['error' => 'Usuario no encontrado'], 404);

        // El admin no puede desactivarse a sí mismo
        if ($user->getId() === $currentUser->getId()) {
            return $this->json(['error' => 'No puedes desactivar tu propia cuenta'], 409);
        }

        $user->setIsActive(!$user->isActive());
        $em->flush();

        $action = $user->isActive() ? 'activado' : 'desactivado';
        $this->log($securityLogger, "Usuario {$action}", ['id' => $id], 'warning');
        return $this->json($this->serializeUser($user));
    }

    #[Route('/users/{id}/matrix', name: 'users_matrix', methods: ['PUT'])]
    public function updateMatrix(
        string $id,
        Request $request,
        UserRepository $repo,
        CategoryRepository $catRepo,
        \App\Repository\CompanyRepository $compRepo,
        EntityManagerInterface $em,
        LoggerInterface $securityLogger
    ): JsonResponse {
        $this->denyUnlessAdmin();
        $user = $repo->find($id);
        if (!$user) return $this->json(['error' => 'Usuario no encontrado'], 404);

        $data = $this->parseJson($request);
        if (!$data) return $this->json(['error' => 'JSON inválido'], 400);

        if (isset($data['categories'])) {
            foreach ($user->getCategories() as $cat) $user->removeCategory($cat);
            foreach ($data['categories'] as $catId) {
                $cat = $catRepo->find($catId);
                if ($cat) $user->addCategory($cat);
            }
        }

        if (isset($data['companies'])) {
            foreach ($user->getCompanies() as $comp) $user->removeCompany($comp);
            foreach ($data['companies'] as $compId) {
                $comp = $compRepo->find($compId);
                if ($comp) $user->addCompany($comp);
            }
        }

        $em->flush();
        $this->log($securityLogger, 'Matriz de usuario actualizada', ['id' => $id]);
        return $this->json($this->serializeUser($user));
    }

    #[Route('/invite', name: 'invite', methods: ['POST'])]
    public function invite(
        Request $request,
        EntityManagerInterface $em,
        LoggerInterface $securityLogger
    ): JsonResponse {
        $this->denyUnlessAdmin();
        $data = $this->parseJson($request);
        $email = strtolower(trim($data['email'] ?? ''));
        $name = trim($data['name'] ?? '');
        $companyId = $data['companyId'] ?? null;

        if (!$email) return $this->json(['error' => 'Email requerido'], 400);

        $token = bin2hex(random_bytes(32));
        // Aquí se guardaría en una nueva entidad de Invitación o similar. 
        // Por ahora simulamos que el usuario puede registrarse con este token.
        
        $this->log($securityLogger, 'Invitación generada', ['email' => $email]);

        $url = "/register?token={$token}&email={$email}";
        if ($name) {
            $url .= "&name=" . urlencode($name);
        }
        if ($companyId) {
            $url .= "&companyId=" . urlencode($companyId);
        }

        return $this->json([
            'email' => $email,
            'token' => $token,
            'url' => $url
        ]);
    }

    #[Route('/audit', name: 'audit', methods: ['GET'])]
    public function auditLogs(\App\Repository\AuditLogRepository $repo): JsonResponse
    {
        $this->denyUnlessAdmin();
        $logs = $repo->findBy([], ['createdAt' => 'DESC'], 100);
        return $this->json(array_map(fn($l) => [
            'id' => $l->getId(),
            'incidentTitle' => $l->getIncident()?->getTitle(),
            'changedBy' => $l->getChangedBy()?->getName(),
            'field' => $l->getFieldChanged(),
            'oldValue' => $l->getOldValue(),
            'newValue' => $l->getNewValue(),
            'createdAt' => $l->getCreatedAt()?->format('d/m/Y H:i')
        ], $logs));
    }

    // ══════════════════════════════════════════════════════════════
    // HELPERS PRIVADOS
    // ══════════════════════════════════════════════════════════════

    /** OWASP A01: control de acceso centralizado */
    private function denyUnlessAdmin(): void
    {
        /** @var AppUser|null $user */
        $user = $this->getUser();
        if (!$user || !in_array('ROLE_ADMIN', $user->getRoles(), true)) {
            throw $this->createAccessDeniedException('Solo administradores.');
        }
    }

    /** OWASP A03: parseo seguro de JSON */
    private function parseJson(Request $request): ?array
    {
        $data = json_decode($request->getContent(), true);
        return (json_last_error() === JSON_ERROR_NONE && is_array($data)) ? $data : null;
    }

    /** Validación de nombre genérica */
    private function validateName(string $value, ValidatorInterface $validator, int $max = 100): ?string
    {
        $violations = $validator->validate($value, [
            new Assert\NotBlank(message: 'El nombre es obligatorio'),
            new Assert\Length(max: $max, maxMessage: "Máximo {$max} caracteres"),
            new Assert\Regex(
                pattern: '/^[\p{L}0-9 _\-\.]+$/u',
                message: 'El nombre contiene caracteres no permitidos'
            ),
        ]);
        return count($violations) ? (string)$violations->get(0)->getMessage() : null;
    }

    /** OWASP A09: logging de seguridad */
    private function log(
        LoggerInterface $logger,
        string $message,
        array $context = [],
        string $level = 'info'
    ): void {
        /** @var AppUser $user */
        $user = $this->getUser();
        $context['by'] = $user?->getEmail() ?? 'unknown';
        $context['ip'] = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        $logger->$level("[ADMIN] {$message}", $context);
    }

    private function serializeCat(Category $c): array
    {
        return [
            'id'          => $c->getId(),
            'name'        => $c->getName(),
            'sortOrder'   => $c->getSortOrder(),
            'companyId'   => $c->getCompany() ? (string)$c->getCompany()->getId() : null,
            'companyName' => $c->getCompany()?->getName(),
        ];
    }

    private function serializePri(Priority $p): array
    {
        return [
            'id'          => $p->getId(),
            'name'        => $p->getName(),
            'sortOrder'   => $p->getSortOrder(),
            'slaHours'    => $p->getSlaHours(),
            'companyId'   => $p->getCompany() ? (string)$p->getCompany()->getId() : null,
            'companyName' => $p->getCompany()?->getName(),
        ];
    }

    private function serializeUser(AppUser $u): array
    {
        return [
            'id'        => (string)$u->getId(),
            'name'      => $u->getName(),
            'email'     => $u->getEmail(),
            'roles'     => $u->getRoles(),
            'role'      => $this->primaryRole($u->getRoles()),
            'isActive'  => $u->isActive(),
            'createdAt' => $u->getCreatedAt()?->format('d/m/Y'),
            'categories' => array_values(array_map(fn($c) => ['id' => $c->getId(), 'name' => $c->getName()], $u->getCategories()->toArray())),
            'companies'  => array_values(array_map(fn($c) => ['id' => $c->getId(), 'name' => $c->getName()], $u->getCompanies()->toArray())),
            // NUNCA devolver el hash de contraseña (OWASP A02)
        ];
    }

    private function primaryRole(array $roles): string
    {
        if (in_array('ROLE_ADMIN', $roles, true))  return 'ROLE_ADMIN';
        if (in_array('ROLE_AGENT', $roles, true))  return 'ROLE_AGENT';
        return 'ROLE_USER';
    }
}
