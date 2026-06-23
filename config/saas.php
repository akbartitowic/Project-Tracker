<?php

return [
    /*
     * The root domain for the SaaS app.
     * Tenants are accessed via: {slug}.{domain}
     * Set APP_DOMAIN in .env (e.g. hubtask.id for production, hubtask.test for local).
     */
    'domain' => env('APP_DOMAIN', 'localhost'),

    /*
     * Plan limits: max users and projects per organization.
     */
    'plans' => [
        'free' => [
            'max_users'    => 5,
            'max_projects' => 3,
        ],
        'pro' => [
            'max_users'    => 25,
            'max_projects' => 20,
        ],
        'enterprise' => [
            'max_users'    => null, // unlimited
            'max_projects' => null,
        ],
    ],
];
