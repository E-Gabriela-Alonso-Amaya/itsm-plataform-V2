<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260515212749 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE incident ADD has_unread_messages_for_agent TINYINT DEFAULT 0 NOT NULL, ADD has_unread_messages_for_employee TINYINT DEFAULT 0 NOT NULL');
        $this->addSql('ALTER TABLE user DROP deleted_at');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE incident DROP has_unread_messages_for_agent, DROP has_unread_messages_for_employee');
        $this->addSql('ALTER TABLE user ADD deleted_at DATETIME DEFAULT NULL');
    }
}
