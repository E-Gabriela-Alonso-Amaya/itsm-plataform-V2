<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260509154921 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE attachment (id BINARY(16) NOT NULL, original_name VARCHAR(255) NOT NULL, stored_name VARCHAR(255) NOT NULL, mime_type VARCHAR(100) NOT NULL, file_size INT NOT NULL, description VARCHAR(500) DEFAULT NULL, created_at DATETIME NOT NULL, incident_id BINARY(16) NOT NULL, uploaded_by_id BINARY(16) NOT NULL, INDEX IDX_795FD9BB59E53FB9 (incident_id), INDEX IDX_795FD9BBA2B28FE8 (uploaded_by_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE audit_log (id BINARY(16) NOT NULL, field_changed VARCHAR(100) NOT NULL, old_value LONGTEXT DEFAULT NULL, new_value LONGTEXT DEFAULT NULL, created_at DATETIME NOT NULL, incident_id BINARY(16) NOT NULL, changed_by_id BINARY(16) DEFAULT NULL, INDEX IDX_F6E1C0F559E53FB9 (incident_id), INDEX IDX_F6E1C0F5828AD0A0 (changed_by_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE category (id INT AUTO_INCREMENT NOT NULL, name VARCHAR(100) NOT NULL, is_active TINYINT NOT NULL, sort_order INT NOT NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE comment (id BINARY(16) NOT NULL, content LONGTEXT NOT NULL, created_at DATETIME NOT NULL, incident_id BINARY(16) NOT NULL, author_id BINARY(16) NOT NULL, INDEX IDX_9474526C59E53FB9 (incident_id), INDEX IDX_9474526CF675F31B (author_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE company (id BINARY(16) NOT NULL, name VARCHAR(255) NOT NULL, logo_url VARCHAR(255) DEFAULT NULL, is_active TINYINT NOT NULL, created_at DATETIME NOT NULL, PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE incident (id BINARY(16) NOT NULL, title VARCHAR(255) NOT NULL, description LONGTEXT NOT NULL, assigned_at DATETIME DEFAULT NULL, ai_analysis_reason LONGTEXT DEFAULT NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, resolved_at DATETIME DEFAULT NULL, category_id INT NOT NULL, priority_id INT NOT NULL, status_id INT NOT NULL, reported_by_id BINARY(16) NOT NULL, assigned_to_id BINARY(16) DEFAULT NULL, company_id BINARY(16) NOT NULL, ai_priority_id INT DEFAULT NULL, INDEX IDX_3D03A11A12469DE2 (category_id), INDEX IDX_3D03A11A497B19F9 (priority_id), INDEX IDX_3D03A11A6BF700BD (status_id), INDEX IDX_3D03A11A71CE806 (reported_by_id), INDEX IDX_3D03A11AF4BD7827 (assigned_to_id), INDEX IDX_3D03A11A979B1AD6 (company_id), INDEX IDX_3D03A11A251CAA46 (ai_priority_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE priority (id INT AUTO_INCREMENT NOT NULL, name VARCHAR(100) NOT NULL, sla_hours INT DEFAULT NULL, is_active TINYINT NOT NULL, sort_order INT NOT NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE status (id INT AUTO_INCREMENT NOT NULL, name VARCHAR(100) NOT NULL, is_default TINYINT NOT NULL, is_closed TINYINT NOT NULL, is_active TINYINT NOT NULL, sort_order INT NOT NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE user (id BINARY(16) NOT NULL, email VARCHAR(180) NOT NULL, roles JSON NOT NULL, password VARCHAR(255) NOT NULL, name VARCHAR(100) NOT NULL, is_active TINYINT NOT NULL, registration_token VARCHAR(255) DEFAULT NULL, token_expires_at DATETIME DEFAULT NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, UNIQUE INDEX UNIQ_8D93D649E7927C74 (email), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('ALTER TABLE attachment ADD CONSTRAINT FK_795FD9BB59E53FB9 FOREIGN KEY (incident_id) REFERENCES incident (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE attachment ADD CONSTRAINT FK_795FD9BBA2B28FE8 FOREIGN KEY (uploaded_by_id) REFERENCES user (id)');
        $this->addSql('ALTER TABLE audit_log ADD CONSTRAINT FK_F6E1C0F559E53FB9 FOREIGN KEY (incident_id) REFERENCES incident (id)');
        $this->addSql('ALTER TABLE audit_log ADD CONSTRAINT FK_F6E1C0F5828AD0A0 FOREIGN KEY (changed_by_id) REFERENCES user (id)');
        $this->addSql('ALTER TABLE comment ADD CONSTRAINT FK_9474526C59E53FB9 FOREIGN KEY (incident_id) REFERENCES incident (id)');
        $this->addSql('ALTER TABLE comment ADD CONSTRAINT FK_9474526CF675F31B FOREIGN KEY (author_id) REFERENCES user (id)');
        $this->addSql('ALTER TABLE incident ADD CONSTRAINT FK_3D03A11A12469DE2 FOREIGN KEY (category_id) REFERENCES category (id)');
        $this->addSql('ALTER TABLE incident ADD CONSTRAINT FK_3D03A11A497B19F9 FOREIGN KEY (priority_id) REFERENCES priority (id)');
        $this->addSql('ALTER TABLE incident ADD CONSTRAINT FK_3D03A11A6BF700BD FOREIGN KEY (status_id) REFERENCES status (id)');
        $this->addSql('ALTER TABLE incident ADD CONSTRAINT FK_3D03A11A71CE806 FOREIGN KEY (reported_by_id) REFERENCES user (id)');
        $this->addSql('ALTER TABLE incident ADD CONSTRAINT FK_3D03A11AF4BD7827 FOREIGN KEY (assigned_to_id) REFERENCES user (id)');
        $this->addSql('ALTER TABLE incident ADD CONSTRAINT FK_3D03A11A979B1AD6 FOREIGN KEY (company_id) REFERENCES company (id)');
        $this->addSql('ALTER TABLE incident ADD CONSTRAINT FK_3D03A11A251CAA46 FOREIGN KEY (ai_priority_id) REFERENCES priority (id)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE attachment DROP FOREIGN KEY FK_795FD9BB59E53FB9');
        $this->addSql('ALTER TABLE attachment DROP FOREIGN KEY FK_795FD9BBA2B28FE8');
        $this->addSql('ALTER TABLE audit_log DROP FOREIGN KEY FK_F6E1C0F559E53FB9');
        $this->addSql('ALTER TABLE audit_log DROP FOREIGN KEY FK_F6E1C0F5828AD0A0');
        $this->addSql('ALTER TABLE comment DROP FOREIGN KEY FK_9474526C59E53FB9');
        $this->addSql('ALTER TABLE comment DROP FOREIGN KEY FK_9474526CF675F31B');
        $this->addSql('ALTER TABLE incident DROP FOREIGN KEY FK_3D03A11A12469DE2');
        $this->addSql('ALTER TABLE incident DROP FOREIGN KEY FK_3D03A11A497B19F9');
        $this->addSql('ALTER TABLE incident DROP FOREIGN KEY FK_3D03A11A6BF700BD');
        $this->addSql('ALTER TABLE incident DROP FOREIGN KEY FK_3D03A11A71CE806');
        $this->addSql('ALTER TABLE incident DROP FOREIGN KEY FK_3D03A11AF4BD7827');
        $this->addSql('ALTER TABLE incident DROP FOREIGN KEY FK_3D03A11A979B1AD6');
        $this->addSql('ALTER TABLE incident DROP FOREIGN KEY FK_3D03A11A251CAA46');
        $this->addSql('DROP TABLE attachment');
        $this->addSql('DROP TABLE audit_log');
        $this->addSql('DROP TABLE category');
        $this->addSql('DROP TABLE comment');
        $this->addSql('DROP TABLE company');
        $this->addSql('DROP TABLE incident');
        $this->addSql('DROP TABLE priority');
        $this->addSql('DROP TABLE status');
        $this->addSql('DROP TABLE user');
    }
}
