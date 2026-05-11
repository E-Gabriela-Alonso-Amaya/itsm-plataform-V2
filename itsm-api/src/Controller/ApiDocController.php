<?php

namespace App\Controller;

use OpenApi\Generator;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

class ApiDocController
{
    #[Route('/api/doc.json', name: 'api_doc_json', methods: ['GET'])]
    public function json(): JsonResponse
    {
        $openapi = Generator::scan([
            __DIR__ . '/../Controller',
            __DIR__ . '/../OpenApi',
        ]);

        return new JsonResponse(
            json_decode($openapi->toJson()),
            200,
            ['Access-Control-Allow-Origin' => '*']
        );
    }
}