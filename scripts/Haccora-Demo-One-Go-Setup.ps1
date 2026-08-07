#requires -Version 5.1

[CmdletBinding()]
param(
    [switch]$SkipMigrations,
    [switch]$SkipInstall
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Write-Heading {
    param([Parameter(Mandatory = $true)][string]$Text)
    Write-Host ""
    Write-Host $Text -ForegroundColor Cyan
    Write-Host ("-" * $Text.Length) -ForegroundColor DarkCyan
}

function Read-RequiredText {
    param(
        [Parameter(Mandatory = $true)][string]$Prompt,
        [string]$Default = ""
    )

    while ($true) {
        $suffix = if ($Default) { " [$Default]" } else { "" }
        $value = (Read-Host "$Prompt$suffix").Trim()
        if (-not $value -and $Default) { return $Default }
        if ($value) { return $value }
        Write-Host "A value is required." -ForegroundColor Yellow
    }
}

function Read-SecretText {
    param([Parameter(Mandatory = $true)][string]$Prompt)

    $secure = Read-Host $Prompt -AsSecureString
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try {
        return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    }
    finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    }
}

function Invoke-ExternalStep {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][scriptblock]$Command
    )

    Write-Heading $Name
    & $Command
    if ($LASTEXITCODE -ne 0) {
        throw "$Name failed with exit code $LASTEXITCODE."
    }
}

function Resolve-RepositoryRoot {
    $candidate = $PSScriptRoot
    if (Test-Path (Join-Path $candidate "package.json")) {
        return (Resolve-Path $candidate).Path
    }

    Write-Host "Place this file in the extracted haccora-connect folder, or enter that folder now."
    $entered = Read-RequiredText -Prompt "Full path to the haccora-connect folder"
    $resolved = (Resolve-Path $entered).Path
    if (-not (Test-Path (Join-Path $resolved "package.json"))) {
        throw "package.json was not found in $resolved. Select the repository root folder."
    }
    return $resolved
}

function Set-ProcessValue {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [AllowNull()][string]$Value
    )
    [Environment]::SetEnvironmentVariable($Name, $Value, "Process")
}

$environmentNames = @(
    "SUPABASE_URL",
    "VITE_SUPABASE_URL",
    "SUPABASE_PUBLISHABLE_KEY",
    "VITE_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "DEMO_ALLOWED_SUPABASE_URL",
    "DEMO_SEED_CONFIRM",
    "DEMO_EMAIL_DOMAIN",
    "DEMO_PASSWORD",
    "HACCORA_ENV",
    "SUPABASE_ACCESS_TOKEN",
    "SUPABASE_DB_PASSWORD"
)

$originalEnvironment = @{}
foreach ($name in $environmentNames) {
    $originalEnvironment[$name] = [Environment]::GetEnvironmentVariable($name, "Process")
}

$publishableKey = $null
$serviceRoleKey = $null
$demoPassword = $null
$accessToken = $null
$databasePassword = $null

try {
    Write-Host ""
    Write-Host "Haccora demo account one-go setup" -ForegroundColor Green
    Write-Host "This creates TEST accounts only. Never use it against a production customer database."

    $repositoryRoot = Resolve-RepositoryRoot
    Set-Location $repositoryRoot

    $package = Get-Content (Join-Path $repositoryRoot "package.json") -Raw | ConvertFrom-Json
    if ($package.name -ne "haccora-uk") {
        throw "This does not appear to be the Haccora UK repository."
    }
    foreach ($requiredScript in @("demo:seed", "demo:verify", "demo:access")) {
        if (-not $package.scripts.$requiredScript) {
            throw "package.json is missing the required '$requiredScript' command. Use the Phase 23 build."
        }
    }

    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        throw "Node.js 22 is required. Install it from https://nodejs.org and run this file again."
    }
    if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
        throw "npm is required and was not found. Reinstall Node.js 22 and run this file again."
    }

    $nodeVersionText = (& node --version).Trim()
    if ($LASTEXITCODE -ne 0) { throw "Node.js could not be started." }
    $nodeMajor = [int](($nodeVersionText -replace '^v', '').Split('.')[0])
    if ($nodeMajor -lt 22) {
        throw "Node.js 22 or later is required. Found $nodeVersionText."
    }

    Write-Heading "Staging Supabase details"
    $supabaseUrl = (Read-RequiredText -Prompt "Staging Supabase URL (https://PROJECT.supabase.co)").TrimEnd('/')
    try { $supabaseUri = [Uri]$supabaseUrl } catch { throw "The Supabase URL is invalid." }
    if ($supabaseUri.Scheme -ne "https" -or -not $supabaseUri.Host.EndsWith(".supabase.co")) {
        throw "Use the HTTPS URL of a Supabase staging project ending in .supabase.co."
    }
    $projectRef = $supabaseUri.Host.Split('.')[0]
    if (-not $projectRef) { throw "The Supabase project reference could not be determined." }

    $publishableKey = Read-SecretText -Prompt "Supabase publishable/anon key (input hidden)"
    $serviceRoleKey = Read-SecretText -Prompt "Supabase service-role/secret key (input hidden)"
    if ($publishableKey.Length -lt 20 -or $serviceRoleKey.Length -lt 20) {
        throw "One or both Supabase keys appear incomplete."
    }
    if ($publishableKey -eq $serviceRoleKey) {
        throw "The publishable key and service-role key must be different."
    }

    $emailDomain = Read-RequiredText -Prompt "Demo email domain" -Default "demo.haccora.co.uk"
    if ($emailDomain -notmatch '^[a-zA-Z0-9.-]+$') {
        throw "The demo email domain contains invalid characters."
    }

    $demoPassword = Read-SecretText -Prompt "Password for all seven demo accounts (16+ characters)"
    $confirmPassword = Read-SecretText -Prompt "Enter the demo password again"
    if ($demoPassword.Length -lt 16) { throw "The demo password must contain at least 16 characters." }
    if ($demoPassword -ne $confirmPassword) { throw "The two demo passwords do not match." }
    $confirmPassword = $null

    Write-Host ""
    Write-Host "Safety confirmation:" -ForegroundColor Yellow
    Write-Host "  Project: $projectRef"
    Write-Host "  URL:     $supabaseUrl"
    Write-Host "  Domain:  $emailDomain"
    $confirmation = Read-RequiredText -Prompt "Type HACCORA_DEMO_ONLY to confirm this is a non-production project"
    if ($confirmation -ne "HACCORA_DEMO_ONLY") {
        throw "Safety confirmation did not match. No accounts were created."
    }

    Set-ProcessValue "SUPABASE_URL" $supabaseUrl
    Set-ProcessValue "VITE_SUPABASE_URL" $supabaseUrl
    Set-ProcessValue "SUPABASE_PUBLISHABLE_KEY" $publishableKey
    Set-ProcessValue "VITE_SUPABASE_PUBLISHABLE_KEY" $publishableKey
    Set-ProcessValue "SUPABASE_SERVICE_ROLE_KEY" $serviceRoleKey
    Set-ProcessValue "DEMO_ALLOWED_SUPABASE_URL" $supabaseUrl
    Set-ProcessValue "DEMO_SEED_CONFIRM" "HACCORA_DEMO_ONLY"
    Set-ProcessValue "DEMO_EMAIL_DOMAIN" $emailDomain
    Set-ProcessValue "DEMO_PASSWORD" $demoPassword
    Set-ProcessValue "HACCORA_ENV" "demo"

    $applyMigrations = $false
    if (-not $SkipMigrations) {
        $migrationAnswer = (Read-Host "Apply all repository migrations first? [y/N]").Trim()
        if ($migrationAnswer -match '^(y|yes)$') { $applyMigrations = $true }
    }

    if ($applyMigrations) {
        if (-not (Get-Command npx -ErrorAction SilentlyContinue)) {
            throw "npx is required to apply Supabase migrations. Reinstall Node.js 22."
        }
        Write-Host ""
        Write-Host "Create a Supabase personal access token at Account > Access Tokens." -ForegroundColor DarkGray
        $accessToken = Read-SecretText -Prompt "Supabase personal access token (input hidden)"
        $databasePassword = Read-SecretText -Prompt "Supabase project database password (input hidden)"
        if (-not $accessToken -or -not $databasePassword) {
            throw "The access token and database password are required to apply migrations."
        }
        Set-ProcessValue "SUPABASE_ACCESS_TOKEN" $accessToken
        Set-ProcessValue "SUPABASE_DB_PASSWORD" $databasePassword

        Invoke-ExternalStep -Name "Linking the staging database" -Command {
            & npx --yes supabase@2.111.0 link --project-ref $projectRef
        }
        Invoke-ExternalStep -Name "Applying Haccora database migrations" -Command {
            & npx --yes supabase@2.111.0 db push
        }
    }
    else {
        Write-Host "Skipping migrations. The Phase 23 migrations must already exist in this Supabase project." -ForegroundColor Yellow
    }

    if (-not $SkipInstall) {
        Invoke-ExternalStep -Name "Installing exact application dependencies" -Command {
            & npm ci
        }
    }

    Invoke-ExternalStep -Name "Creating or resetting all seven demo accounts" -Command {
        & npm run demo:seed
    }
    Invoke-ExternalStep -Name "Verifying the seeded client and roles" -Command {
        & npm run demo:verify
    }
    Invoke-ExternalStep -Name "Testing sign-in, RLS and tenant isolation" -Command {
        & npm run demo:access
    }

    Write-Heading "Haccora demo is ready"
    Write-Host "Use the private password you entered with these accounts:" -ForegroundColor Green
    foreach ($login in @(
        "saas-owner@$emailDomain",
        "tenant-admin@$emailDomain",
        "manager@$emailDomain",
        "chef@$emailDomain",
        "staff@$emailDomain",
        "inspector@$emailDomain",
        "isolation-owner@$emailDomain"
    )) {
        Write-Host "  $login"
    }
    Write-Host ""
    Write-Host "Open your deployed Haccora app and add /login to its address."
    Write-Host "The SaaS owner is redirected to /platform after sign-in."
}
catch {
    Write-Host ""
    Write-Host "SETUP STOPPED" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host "No password or key has been printed. Correct the reported item and run this file again."
    exit 1
}
finally {
    foreach ($name in $environmentNames) {
        Set-ProcessValue $name $originalEnvironment[$name]
    }
    $publishableKey = $null
    $serviceRoleKey = $null
    $demoPassword = $null
    $accessToken = $null
    $databasePassword = $null
}
