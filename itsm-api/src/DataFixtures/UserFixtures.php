<?php

namespace App\DataFixtures;

use App\Entity\User;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

class UserFixtures extends Fixture
{
    public function __construct(
        private UserPasswordHasherInterface $hasher
    ) {}

    public function load(ObjectManager $manager): void
    {
        // Crear o reutilizar empresas base (idempotente)
       
        $companyAlpha = $companyRepo->findOneBy(['name' => 'Alpha']) ?? new \App\Entity\Company();
        $companyAlpha->setName('Alpha')->setIsActive(true);
        $manager->persist($companyAlpha);

        $companyBeta = $companyRepo->findOneBy(['name' => 'Beta']) ?? new \App\Entity\Company();
        $companyBeta->setName('Beta')->setIsActive(true);
        $manager->persist($companyBeta);

        // Usuarios solicitados
        $usersData = [
            ['email' => 'admin@email.com', 'name' => 'Administrador', 'password' => 'admin1234', 'roles' => ['ROLE_ADMIN'], 'company' => $companyGlobal],
            ['email' => 'agente01@email.com', 'name' => 'Agente 01', 'password' => 'agente1234', 'roles' => ['ROLE_AGENT'], 'company' => $companyAlpha],
            ['email' => 'agente02@email.com', 'name' => 'Agente 02', 'password' => 'agente1234', 'roles' => ['ROLE_AGENT'], 'company' => $companyBeta],
            ['email' => 'user.alpha@email.com', 'name' => 'Usuario Alpha', 'password' => 'user1234', 'roles' => [], 'company' => $companyAlpha],
            ['email' => 'user.beta@email.com', 'name' => 'Usuario Beta', 'password' => 'user1234', 'roles' => [], 'company' => $companyBeta],
        ];

        foreach ($usersData as $u) {
            $existing = $manager->getRepository(User::class)->findOneBy(['email' => $u['email']]);
            if ($existing) {
                // Actualizar datos no sensibles (roles y empresa), y re-hashear password por si se desea sincronizar
                $existing->setName($u['name']);
                $existing->setRoles($u['roles']);
                $existing->setIsActive(true);
                $existing->setPassword($this->hasher->hashPassword($existing, $u['password']));
                if (!empty($u['company'])) {
                    $existing->addCompany($u['company']);
                }
                $manager->persist($existing);
            } else {
                $user = new User();
                $user->setEmail($u['email']);
                $user->setName($u['name']);
                $user->setRoles($u['roles']);
                $user->setIsActive(true);
                $user->setPassword($this->hasher->hashPassword($user, $u['password']));
                if (!empty($u['company'])) {
                    $user->addCompany($u['company']);
                }
                $manager->persist($user);
            }
        }

        $manager->flush();
    }
}