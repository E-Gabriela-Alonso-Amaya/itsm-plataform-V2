<?php

namespace App\Command;

use App\Entity\Company;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

#[AsCommand(
    name: 'app:populate-db',
    description: 'Puebla la base de datos con datos iniciales',
)]
class PopulateDbCommand extends Command
{
    public function __construct(
        private EntityManagerInterface $em,
        private UserPasswordHasherInterface $hasher
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);

        // 1. Administrador
        $admin = new User();
        $admin->setName('Administrador');
        $admin->setEmail('admin@email.com');
        $admin->setRoles(['ROLE_ADMIN']);
        $admin->setPassword($this->hasher->hashPassword($admin, 'admin1234'));
        $this->em->persist($admin);

        // 2. Agentes
        $agent1 = new User();
        $agent1->setName('Técnico 01');
        $agent1->setEmail('agente01@email.com');
        $agent1->setRoles(['ROLE_AGENT']);
        $agent1->setPassword($this->hasher->hashPassword($agent1, 'agente1234'));
        $this->em->persist($agent1);

        $agent2 = new User();
        $agent2->setName('Técnico 02');
        $agent2->setEmail('agente02@email.com');
        $agent2->setRoles(['ROLE_AGENT']);
        $agent2->setPassword($this->hasher->hashPassword($agent2, 'agente1234'));
        $this->em->persist($agent2);

        // 3. Empresas
        $comp1 = new Company();
        $comp1->setName('Empresa Alpha');
        $this->em->persist($comp1);

        $comp2 = new Company();
        $comp2->setName('Empresa Beta');
        $this->em->persist($comp2);

        // 4. Usuarios de empresas
        $user1 = new User();
        $user1->setName('Usuario Alpha');
        $user1->setEmail('user.alpha@email.com');
        $user1->setRoles(['ROLE_USER']);
        $user1->setPassword($this->hasher->hashPassword($user1, 'user1234'));
        $user1->addCompany($comp1);
        $this->em->persist($user1);

        $user2 = new User();
        $user2->setName('Usuario Beta');
        $user2->setEmail('user.beta@email.com');
        $user2->setRoles(['ROLE_USER']);
        $user2->setPassword($this->hasher->hashPassword($user2, 'user1234'));
        $user2->addCompany($comp2);
        $this->em->persist($user2);

        $this->em->flush();

        $io->success('Base de datos poblada correctamente.');

        return Command::SUCCESS;
    }
}
