<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'twilio' => [
        'account_sid' => env('TWILIO_ACCOUNT_SID', ''),
        'auth_token' => env('TWILIO_AUTH_TOKEN', ''),
        'whatsapp_from' => env('TWILIO_WHATSAPP_FROM', ''),
    ],

    'chirpstack' => [
        'url' => env('CHIRPSTACK_URL', 'https://cloud.chirpstack.io'),
        'api_key' => env('CHIRPSTACK_API_KEY', ''),
        'tenant_id' => env('CHIRPSTACK_TENANT_ID', ''),

        // Maps sensor model names to ChirpStack device profile UUIDs.
        // Set these after creating device profiles in ChirpStack.
        'device_profiles' => [
            'EM300-TH' => env('CHIRPSTACK_PROFILE_EM300TH', ''),
            'CT101' => env('CHIRPSTACK_PROFILE_CT101', ''),
            'WS301' => env('CHIRPSTACK_PROFILE_WS301', ''),
            'GS101' => env('CHIRPSTACK_PROFILE_GS101', ''),
            'AM307' => env('CHIRPSTACK_PROFILE_AM307', ''),
            'EM300-PT' => env('CHIRPSTACK_PROFILE_EM300PT', ''),
            'EM310-UDL' => env('CHIRPSTACK_PROFILE_EM310UDL', ''),
        ],
    ],

    'facturapi' => [
        'api_key' => env('FACTURAPI_API_KEY', ''),
    ],

    'sap' => [
        'endpoint' => env('SAP_API_ENDPOINT'),
        'api_key' => env('SAP_API_KEY'),
        'company_code' => env('SAP_COMPANY_CODE'),
    ],

    'contpaq' => [
        'endpoint' => env('CONTPAQ_API_ENDPOINT'),
        'api_key' => env('CONTPAQ_API_KEY'),
    ],

];
