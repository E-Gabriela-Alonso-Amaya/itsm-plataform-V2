<?php

namespace App\Entity;

use App\Repository\AttachmentRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity(repositoryClass: AttachmentRepository::class)]
#[ORM\Table(name: 'attachment')]
#[ORM\HasLifecycleCallbacks]
class Attachment
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    #[ORM\GeneratedValue(strategy: 'CUSTOM')]
    #[ORM\CustomIdGenerator(class: 'doctrine.uuid_generator')]
    private ?Uuid $id = null;

    #[ORM\ManyToOne(targetEntity: Incident::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?Incident $incident = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: false)]
    private ?User $uploadedBy = null;

    #[ORM\Column(length: 255)]
    private string $originalName = '';

    #[ORM\Column(length: 255)]
    private string $storedName = '';// Nombre en disco (UUID + extensión)

    #[ORM\Column(length: 100)]
    private string $mimeType = ''; // Tipo MIME del archivo (ej. "image/png", "application/pdf")

    #[ORM\Column]
    private int $fileSize = 0;

    // Descripción opcional aportada por el técnico
    #[ORM\Column(length: 500, nullable: true)]
    private ?string $description = null;

    #[ORM\Column]
    private ?\DateTimeImmutable $createdAt = null;

    #[ORM\PrePersist]
    public function onPrePersist(): void
    {
        $this->createdAt = new \DateTimeImmutable();
    }


    public function getId(): ?Uuid { return $this->id; }

    public function getIncident(): ?Incident { return $this->incident; }
    public function setIncident(Incident $incident): static { $this->incident = $incident; return $this; }

    public function getUploadedBy(): ?User { return $this->uploadedBy; }
    public function setUploadedBy(User $user): static { $this->uploadedBy = $user; return $this; }

    public function getOriginalName(): string { return $this->originalName; }
    public function setOriginalName(string $name): static { $this->originalName = $name; return $this; }

    public function getStoredName(): string { return $this->storedName; }
    public function setStoredName(string $name): static { $this->storedName = $name; return $this; }

    public function getMimeType(): string { return $this->mimeType; }
    public function setMimeType(string $mime): static { $this->mimeType = $mime; return $this; }

    public function getFileSize(): int { return $this->fileSize; }
    public function setFileSize(int $size): static { $this->fileSize = $size; return $this; }

    public function getDescription(): ?string { return $this->description; }
    public function setDescription(?string $desc): static { $this->description = $desc; return $this; }

    public function getCreatedAt(): ?\DateTimeImmutable { return $this->createdAt; }
}