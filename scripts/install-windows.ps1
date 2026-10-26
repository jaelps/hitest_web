$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$ApiDirectory = Join-Path $ProjectRoot "apps\api"
$EnvironmentFile = Join-Path $ApiDirectory ".env"

function Invoke-Checked {
  param(
    [Parameter(Mandatory = $true)][string]$Executable,
    [Parameter(Mandatory = $true)][string[]]$Arguments
  )

  & $Executable @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "O comando '$Executable $($Arguments -join ' ')' terminou com erro ($LASTEXITCODE)."
  }
}

function Install-WingetPackage {
  param([Parameter(Mandatory = $true)][string]$PackageId)

  Write-Host "Instalando $PackageId pelo winget..."
  Invoke-Checked -Executable "winget" -Arguments @(
    "install", "--id", $PackageId, "--exact",
    "--accept-package-agreements", "--accept-source-agreements"
  )
}

function Refresh-ProcessPath {
  $machinePath = [Environment]::GetEnvironmentVariable("Path", "Machine")
  $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
  $env:Path = "$machinePath;$userPath"
}

function Read-RequiredValue {
  param([Parameter(Mandatory = $true)][string]$Prompt)

  do {
    $value = Read-Host $Prompt
    if ([string]::IsNullOrWhiteSpace($value)) {
      Write-Host "Este valor e obrigatorio." -ForegroundColor Yellow
    }
  } while ([string]::IsNullOrWhiteSpace($value))

  return $value.Trim()
}

function Read-AdminPassword {
  do {
    $secureValue = Read-Host "Senha do usuario administrador (minimo 8 caracteres)" -AsSecureString
    $pointer = [IntPtr]::Zero
    try {
      $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureValue)
      $value = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    }
    finally {
      if ($pointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
      }
    }

    if ($value.Length -lt 8) {
      Write-Host "A senha deve conter pelo menos 8 caracteres." -ForegroundColor Yellow
    }
  } while ($value.Length -lt 8)

  return $value
}

try {
  Write-Host "Preparando o HiTest em $ProjectRoot" -ForegroundColor Cyan
  Write-Host "Banco local SQLite selecionado. Docker e PostgreSQL nao sao necessarios."

  if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
    throw "O winget nao esta disponivel. Instale o App Installer pela Microsoft Store e execute INSTALAR.bat novamente."
  }

  Refresh-ProcessPath
  if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Install-WingetPackage -PackageId "OpenJS.NodeJS.LTS"
    Refresh-ProcessPath
  }

  if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    throw "O npm nao foi encontrado. Feche e reabra o terminal para atualizar o PATH, depois execute INSTALAR.bat novamente."
  }
  $nodeMajor = [int]((& node --version).TrimStart("v").Split(".")[0])
  if ($nodeMajor -lt 20) {
    Install-WingetPackage -PackageId "OpenJS.NodeJS.LTS"
    Refresh-ProcessPath
    $nodeMajor = [int]((& node --version).TrimStart("v").Split(".")[0])
    if ($nodeMajor -lt 20) {
      throw "Node.js 20 ou superior e necessario. Atualize o Node.js LTS e execute INSTALAR.bat novamente."
    }
  }

  Push-Location $ProjectRoot
  try {
    Write-Host "Instalando as dependencias do projeto..."
    Invoke-Checked -Executable "npm" -Arguments @("install")

    if (-not (Test-Path $EnvironmentFile)) {
      Write-Host "Configure o primeiro usuario administrador."
      $adminName = Read-Host "Nome (pressione Enter para usar Administrador)"
      if ([string]::IsNullOrWhiteSpace($adminName)) { $adminName = "Administrador" }
      $adminEmail = Read-RequiredValue -Prompt "E-mail do administrador"
      $adminPassword = Read-AdminPassword
      $jwtSecretBytes = New-Object byte[] 48
      $random = [System.Security.Cryptography.RandomNumberGenerator]::Create()
      try {
        $random.GetBytes($jwtSecretBytes)
      }
      finally {
        $random.Dispose()
      }
      $jwtSecret = [Convert]::ToBase64String($jwtSecretBytes)

      $environment = @(
        'DATABASE_URL="file:./dev.db"'
        "JWT_SECRET=`"$jwtSecret`""
        "PORT=3000"
        'WEB_ORIGIN="http://localhost:5173"'
        "SEED_ADMIN_NAME=`"$($adminName.Replace('"', '\"'))`""
        "SEED_ADMIN_EMAIL=`"$($adminEmail.Replace('"', '\"'))`""
        "SEED_ADMIN_PASSWORD=`"$($adminPassword.Replace('"', '\"'))`""
      )
      Set-Content -Path $EnvironmentFile -Value $environment -Encoding UTF8
      $adminPassword = $null
      $jwtSecretBytes = $null
      $jwtSecret = $null
      Write-Host "Credenciais salvas somente em apps\api\.env (arquivo ignorado pelo Git)."
    }
    else {
      Write-Host "apps\api\.env ja existe; mantendo as configuracoes e credenciais atuais."
    }

    $databaseUrl = Get-Content $EnvironmentFile | Where-Object { $_ -match '^\s*DATABASE_URL\s*=' } | Select-Object -First 1
    if (-not $databaseUrl -or $databaseUrl -notmatch '^\s*DATABASE_URL\s*=\s*["'']?file:') {
      throw "apps\api\.env aponta para outro banco. O instalador usa SQLite; atualize DATABASE_URL para file:./dev.db ou configure manualmente o PostgreSQL opcional."
    }

    Invoke-Checked -Executable "npm" -Arguments @("run", "prisma:generate", "-w", "@equipamentos/api")
    Invoke-Checked -Executable "npm" -Arguments @("run", "prisma:migrate", "-w", "@equipamentos/api")
    Invoke-Checked -Executable "npm" -Arguments @("run", "prisma:seed", "-w", "@equipamentos/api")

    Write-Host ""
    Write-Host "Instalacao concluida. A aplicacao pode ser acessada em http://localhost:5173" -ForegroundColor Green
    $startNow = Read-Host "Deseja iniciar a aplicacao agora? (S/n)"
    if ($startNow -notmatch "^(n|nao|não)$") {
      Invoke-Checked -Executable "npm" -Arguments @("run", "dev")
    }
    else {
      Write-Host "Para iniciar depois, execute 'npm run dev' nesta pasta."
    }
  }
  finally {
    Pop-Location
  }
}
catch {
  Write-Host ""
  Write-Host "Instalacao interrompida: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "Consulte INICIAR.md. Voce pode executar INSTALAR.bat novamente depois de resolver o problema."
  exit 1
}
