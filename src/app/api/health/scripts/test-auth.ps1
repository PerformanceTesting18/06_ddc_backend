# Windows PowerShell Authentication Test Script
# Save this file as: scripts/test-auth.ps1

Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "🐕 DOG DAYCARE - AUTHENTICATION API TEST (Windows)" -ForegroundColor Green
Write-Host "=======================================================" -ForegroundColor Cyan

# Configuration
$baseUrl = "http://localhost:3000"
$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$testEmail = "testuser_$timestamp@example.com"
$testPassword = "Test@1234"

# Function to make API calls
function Invoke-ApiRequest {
    param(
        [string]$Method,
        [string]$Url,
        [object]$Body = $null,
        [hashtable]$Headers = @{}
    )
    
    try {
        $params = @{
            Uri = $Url
            Method = $Method
            ContentType = "application/json"
        }
        
        if ($Body) {
            $params.Body = $Body | ConvertTo-Json
        }
        
        if ($Headers.Count -gt 0) {
            $params.Headers = $Headers
        }
        
        $response = Invoke-RestMethod @params
        return @{
            Success = $true
            Data = $response
            Raw = $response
        }
    }
    catch {
        return @{
            Success = $false
            Error = $_.Exception.Message
            StatusCode = $_.Exception.Response.StatusCode.value__
            RawError = $_
        }
    }
}

# 1. Test Health Endpoint
Write-Host "`n[1/6] Testing Health Endpoint..." -ForegroundColor Yellow
$health = Invoke-ApiRequest -Method GET -Url "$baseUrl/api/health"

if ($health.Success) {
    Write-Host "   ✅ HEALTH CHECK PASSED" -ForegroundColor Green
    Write-Host "   Status: $($health.Data.status)" -ForegroundColor Cyan
} else {
    Write-Host "   ❌ HEALTH CHECK FAILED" -ForegroundColor Red
    Write-Host "   Error: $($health.Error)" -ForegroundColor Red
    exit 1
}

# 2. Test User Registration
Write-Host "`n[2/6] Testing User Registration..." -ForegroundColor Yellow
$registerBody = @{
    email = $testEmail
    password = $testPassword
    firstName = "Test"
    lastName = "User"
    phone = "+1234567890"
    role = "USER"
}

$register = Invoke-ApiRequest -Method POST -Url "$baseUrl/api/auth/register" -Body $registerBody

if ($register.Success) {
    $accessToken = $register.Data.data.tokens.accessToken
    $refreshToken = $register.Data.data.tokens.refreshToken
    $userId = $register.Data.data.user.id
    
    Write-Host "   ✅ REGISTRATION SUCCESSFUL" -ForegroundColor Green
    Write-Host "   User ID: $userId" -ForegroundColor Cyan
    Write-Host "   Email: $testEmail" -ForegroundColor Cyan
    Write-Host "   Access Token: $($accessToken.Substring(0, 20))..." -ForegroundColor DarkCyan
} else {
    Write-Host "   ❌ REGISTRATION FAILED" -ForegroundColor Red
    Write-Host "   Error: $($register.Error)" -ForegroundColor Red
    Write-Host "   Status Code: $($register.StatusCode)" -ForegroundColor Red
    exit 1
}

# 3. Test Get Current User (with valid token)
Write-Host "`n[3/6] Testing Get Current User (with valid token)..." -ForegroundColor Yellow
$meHeaders = @{
    "Authorization" = "Bearer $accessToken"
}

$me = Invoke-ApiRequest -Method GET -Url "$baseUrl/api/auth/me" -Headers $meHeaders

if ($me.Success) {
    Write-Host "   ✅ GET USER PROFILE SUCCESSFUL" -ForegroundColor Green
    Write-Host "   Name: $($me.Data.data.user.firstName) $($me.Data.data.user.lastName)" -ForegroundColor Cyan
    Write-Host "   Role: $($me.Data.data.user.role)" -ForegroundColor Cyan
} else {
    Write-Host "   ❌ GET USER PROFILE FAILED" -ForegroundColor Red
    Write-Host "   Error: $($me.Error)" -ForegroundColor Red
}

# 4. Test Token Refresh
Write-Host "`n[4/6] Testing Token Refresh..." -ForegroundColor Yellow
$refreshBody = @{
    refreshToken = $refreshToken
}

$refresh = Invoke-ApiRequest -Method POST -Url "$baseUrl/api/auth/refresh" -Body $refreshBody

if ($refresh.Success) {
    $newAccessToken = $refresh.Data.data.accessToken
    Write-Host "   ✅ TOKEN REFRESH SUCCESSFUL" -ForegroundColor Green
    Write-Host "   New Token: $($newAccessToken.Substring(0, 20))..." -ForegroundColor DarkCyan
} else {
    Write-Host "   ❌ TOKEN REFRESH FAILED" -ForegroundColor Red
    Write-Host "   Error: $($refresh.Error)" -ForegroundColor Red
}

# 5. Test Logout
Write-Host "`n[5/6] Testing Logout..." -ForegroundColor Yellow
$logoutBody = @{
    refreshToken = $refreshToken
}

$logout = Invoke-ApiRequest -Method POST -Url "$baseUrl/api/auth/logout" -Body $logoutBody

if ($logout.Success) {
    Write-Host "   ✅ LOGOUT SUCCESSFUL" -ForegroundColor Green
} else {
    Write-Host "   ❌ LOGOUT FAILED" -ForegroundColor Red
    Write-Host "   Error: $($logout.Error)" -ForegroundColor Red
}

# 6. Test Get User with Invalid Token
Write-Host "`n[6/6] Testing with Invalid Token (Should Fail)..." -ForegroundColor Yellow
$invalidHeaders = @{
    "Authorization" = "Bearer invalid_token_12345"
}

$invalid = Invoke-ApiRequest -Method GET -Url "$baseUrl/api/auth/me" -Headers $invalidHeaders

if (-not $invalid.Success -and $invalid.StatusCode -eq 401) {
    Write-Host "   ✅ CORRECTLY REJECTED INVALID TOKEN" -ForegroundColor Green
    Write-Host "   Expected: 401 Unauthorized" -ForegroundColor Cyan
    Write-Host "   Received: $($invalid.StatusCode) $($invalid.Error)" -ForegroundColor Cyan
} else {
    Write-Host "   ❌ SHOULD HAVE FAILED BUT DIDN'T" -ForegroundColor Red
    Write-Host "   Response: $($invalid | ConvertTo-Json -Depth 1)" -ForegroundColor Red
}

# Summary
Write-Host "`n=======================================================" -ForegroundColor Cyan
Write-Host "📊 TEST SUMMARY" -ForegroundColor Green
Write-Host "=======================================================" -ForegroundColor Cyan

$tests = @(
    @{Name="Health Check"; Result=$health.Success},
    @{Name="Registration"; Result=$register.Success},
    @{Name="Get User Profile"; Result=$me.Success},
    @{Name="Token Refresh"; Result=$refresh.Success},
    @{Name="Logout"; Result=$logout.Success},
    @{Name="Invalid Token Check"; Result=(-not $invalid.Success -and $invalid.StatusCode -eq 401)}
)

$passed = 0
foreach ($test in $tests) {
    if ($test.Result) {
        Write-Host "   ✅ $($test.Name)" -ForegroundColor Green
        $passed++
    } else {
        Write-Host "   ❌ $($test.Name)" -ForegroundColor Red
    }
}

Write-Host "`n🎯 Results: $passed/$($tests.Count) tests passed" -ForegroundColor Yellow

if ($passed -eq $tests.Count) {
    Write-Host "`n🎉 ALL TESTS PASSED! Authentication system is working correctly." -ForegroundColor Green
} else {
    Write-Host "`n⚠️  Some tests failed. Check the errors above." -ForegroundColor Red
}

Write-Host "`n🔧 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Keep the server running: npm run dev" -ForegroundColor White
Write-Host "2. Test with Thunder Client in VSCode" -ForegroundColor White
Write-Host "3. Or use the curl commands below" -ForegroundColor White