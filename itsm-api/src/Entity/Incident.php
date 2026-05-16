<?php

namespace App\Entity;

use App\Repository\IncidentRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Validator\Constraints as Assert; //usar  para validaciones #[Assert\NotBlank], #[Assert\Length], etc. directamente en las propiedades de la entidad.

// generar UUID, +seguro y autoincremental

#[ORM\Entity(repositoryClass: IncidentRepository::class)]
#[ORM\Table(name: 'incident')]
#[ORM\HasLifecycleCallbacks]
class Incident
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    #[ORM\GeneratedValue(strategy: 'CUSTOM')]
    #[ORM\CustomIdGenerator(class: 'doctrine.uuid_generator')] //genera el id automáticamente
    private ?Uuid $id = null;

    #[ORM\Column(length: 255)]
    #[Assert\NotBlank(message: 'El título no puede estar vacío')]
    #[Assert\Length(
        min: 5,
        max: 255,
        minMessage: 'El título debe tener al menos 5 caracteres',
        maxMessage: 'El título no puede superar los 255 caracteres'
    )]
    private string $title = '';

    #[ORM\Column(type: Types::TEXT)]
    #[Assert\NotBlank(message: 'La descripción no puede estar vacía')]
    #[Assert\Length(
        min: 10,
        max: 5000,
        minMessage: 'La descripción debe tener al menos 10 caracteres',
        maxMessage: 'La descripción no puede superar los 5000 caracteres'
    )]
    private string $description = '';

    #[ORM\ManyToOne(targetEntity: Category::class)] //muchos incidentes pueden tener la misma categoría
    #[ORM\JoinColumn(nullable: false)] //category es obligatorio.
    #[Assert\NotNull(message: 'Categoría es obligatoria')]
    private ?Category $category = null;

    #[ORM\ManyToOne(targetEntity: Priority::class)] //muchos incidentes pueden tener la misma prioridad
    #[ORM\JoinColumn(nullable: true)]
    private ?Priority $priority = null;

    #[ORM\ManyToOne(targetEntity: Status::class)] //muchos incidentes pueden tener el mismo estado
    #[ORM\JoinColumn(nullable: false)]
    #[Assert\NotNull(message: 'Estado es obligatorio')]
    private ?Status $status = null;

    #[ORM\ManyToOne(targetEntity: User::class)] //muchos incidentes pueden tener al mismo usuario
    #[ORM\JoinColumn(nullable: false)]
    private ?User $reportedBy = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: true)] //es nullable — al crear el incident puede no estar asignado a nadie aún.
    private ?User $assignedTo = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: true)]
    private ?User $pendingAssignee = null;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $pendingAssignedAt = null;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $assignedAt = null;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $startedAt = null;

    #[ORM\ManyToOne(targetEntity: Company::class)]
    #[ORM\JoinColumn(nullable: false)]
    #[Assert\NotNull(message: 'Empresa es obligatoria')]
    private ?Company $company = null;

    #[ORM\ManyToOne(targetEntity: Priority::class)]
    #[ORM\JoinColumn(nullable: true)]
    private ?Priority $aiPriority = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $aiAnalysisReason = null;


    #[ORM\Column(nullable: true)]
    private ?int $rating = null;

    #[ORM\Column]
    private ?\DateTimeImmutable $createdAt = null;
    #[ORM\Column]
    private ?\DateTimeImmutable $updatedAt = null;
    #[ORM\Column(nullable: true )] // es nullable porque solo se rellena cuando el incident se resuelve. Al crearse siempre es null.
    private ?\DateTimeImmutable $resolvedAt = null;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $pausedAt = null;

    #[ORM\Column(options: ["default" => 0])]
    private int $totalPausedMs = 0;

    #[ORM\Column(options: ["default" => false])]
    private bool $hasUnreadMessagesForAgent = false;

    #[ORM\Column(options: ["default" => false])]
    private bool $hasUnreadMessagesForEmployee = false;

    public function getRating(): ?int
    {
        return $this->rating;
    }

    public function setRating(?int $rating): static
    {
        $this->rating = $rating;
        return $this;
    }


    #[ORM\PrePersist]
    public function onPrePersist(): void
    {
        $this->createdAt = new \DateTimeImmutable();
        $this->updatedAt = new \DateTimeImmutable();
    }
    #[ORM\PreUpdate]
    public function onPreUpdate(): void
    {
        $this->updatedAt = new \DateTimeImmutable();
    }

    public function getId(): ?Uuid
    {
        return $this->id;
    }

    public function getTitle(): string
    {
        return $this->title;
    }

    public function setTitle(string $title): static
    {
        $this->title = $title;

        return $this;
    }

    public function getDescription(): string
    {
        return $this->description;
    }

    public function setDescription(string $description): static
    {
        $this->description = $description;

        return $this;
    }

    public function getCategory(): ?Category
    {
        return $this->category;
    }

    public function getPriority(): ?Priority
    {
        return $this->priority;
    }

    public function getStatus(): ?Status
    {
        return $this->status;
    }

    public function getReportedBy(): ?User
    {
        return $this->reportedBy;
    }

    public function getAssignedTo(): ?User
    {
        return $this->assignedTo;
    }

    public function getAssignedAt(): ?\DateTimeImmutable
    {
        return $this->assignedAt;
    }

    public function getStartedAt(): ?\DateTimeImmutable
    {
        return $this->startedAt;
    }

    public function getCompany(): ?Company
    {
        return $this->company;
    }

    public function getAiPriority(): ?Priority
    {
        return $this->aiPriority;
    }

    public function getAiAnalysisReason(): ?string
    {
        return $this->aiAnalysisReason;
    }

    public function getCreatedAt(): ?\DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function getUpdatedAt(): ?\DateTimeImmutable
    {
        return $this->updatedAt;
    }

    public function getResolvedAt(): ?\DateTimeImmutable
    {
        return $this->resolvedAt;
    }

    public function setCategory(Category $category): static
    {
        $this->category = $category;
        return $this;
    }

    public function setPriority(Priority $priority): static
    {
        $this->priority = $priority;
        return $this;
    }

    public function setStatus(Status $status): static
    {
        $this->status = $status;
        return $this;
    }

    public function setReportedBy(User $reportedBy): static
    {
        $this->reportedBy = $reportedBy;
        return $this;
    }

    public function setAssignedTo(?User $assignedTo): static
    {
        if (null === $this->assignedTo && null !== $assignedTo) {
            $this->assignedAt = new \DateTimeImmutable();
        }
        
        $this->assignedTo = $assignedTo;
        return $this;
    }

    public function setAssignedAt(?\DateTimeImmutable $assignedAt): static
    {
        $this->assignedAt = $assignedAt;
        return $this;
    }

    public function setStartedAt(?\DateTimeImmutable $startedAt): static
    {
        $this->startedAt = $startedAt;
        return $this;
    }

    public function setCompany(Company $company): static
    {
        $this->company = $company;
        return $this;
    }

    public function setAiPriority(?Priority $aiPriority): static
    {
        $this->aiPriority = $aiPriority;
        return $this;
    }

    public function setAiAnalysisReason(?string $aiAnalysisReason): static
    {
        $this->aiAnalysisReason = $aiAnalysisReason;
        return $this;
    }

    public function setResolvedAt(?\DateTimeImmutable $resolvedAt): static
    {
        $this->resolvedAt = $resolvedAt;
        return $this;
    }

    public function setCreatedAt(\DateTimeImmutable $createdAt): static
    {
        $this->createdAt = $createdAt;

        return $this;
    }

    public function setUpdatedAt(\DateTimeImmutable $updatedAt): static
    {
        $this->updatedAt = $updatedAt;

        return $this;
    }

    public function getPausedAt(): ?\DateTimeImmutable
    {
        return $this->pausedAt;
    }

    public function setPausedAt(?\DateTimeImmutable $pausedAt): static
    {
        $this->pausedAt = $pausedAt;
        return $this;
    }

    public function getTotalPausedMs(): int
    {
        return $this->totalPausedMs;
    }

    public function setTotalPausedMs(int $totalPausedMs): static
    {
        $this->totalPausedMs = $totalPausedMs;
        return $this;
    }

    public function hasUnreadMessagesForAgent(): bool
    {
        return $this->hasUnreadMessagesForAgent;
    }

    public function setHasUnreadMessagesForAgent(bool $hasUnreadMessagesForAgent): static
    {
        $this->hasUnreadMessagesForAgent = $hasUnreadMessagesForAgent;
        return $this;
    }

    public function hasUnreadMessagesForEmployee(): bool
    {
        return $this->hasUnreadMessagesForEmployee;
    }

    public function setHasUnreadMessagesForEmployee(bool $hasUnreadMessagesForEmployee): static
    {
        $this->hasUnreadMessagesForEmployee = $hasUnreadMessagesForEmployee;
        return $this;
    }

    public function getPendingAssignee(): ?User
    {
        return $this->pendingAssignee;
    }

    public function setPendingAssignee(?User $pendingAssignee): static
    {
        $this->pendingAssignee = $pendingAssignee;
        return $this;
    }

    public function getPendingAssignedAt(): ?\DateTimeImmutable
    {
        return $this->pendingAssignedAt;
    }

    public function setPendingAssignedAt(?\DateTimeImmutable $pendingAssignedAt): static
    {
        $this->pendingAssignedAt = $pendingAssignedAt;
        return $this;
    }

}
