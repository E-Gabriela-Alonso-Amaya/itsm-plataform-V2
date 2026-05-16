<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260516084702 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE incident ADD pending_assigned_at DATETIME DEFAULT NULL, ADD pending_assignee_id BINARY(16) DEFAULT NULL');
        $this->addSql('ALTER TABLE incident ADD CONSTRAINT FK_3D03A11A248F2A4 FOREIGN KEY (pending_assignee_id) REFERENCES user (id)');
        $this->addSql('CREATE INDEX IDX_3D03A11A248F2A4 ON incident (pending_assignee_id)');
        $this->addSql('ALTER TABLE user DROP deleted_at');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE incident DROP FOREIGN KEY FK_3D03A11A248F2A4');
        $this->addSql('DROP INDEX IDX_3D03A11A248F2A4 ON incident');
        $this->addSql('ALTER TABLE incident DROP pending_assigned_at, DROP pending_assignee_id');
        $this->addSql('ALTER TABLE user ADD deleted_at DATETIME DEFAULT NULL');
    }
}
