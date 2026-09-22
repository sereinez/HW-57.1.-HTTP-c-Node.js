# test-server.ps1
# Runs all routes and error scenarios through curl.exe and prints PASS/FAIL.
# Usage: in ONE window  -> node server.js
#        in ANOTHER one -> .\test-server.ps1

$baseUrl = "http://localhost:3000"
$passed = 0
$failed = 0

function Test-Case {
    param(
        [string]$Name,
        [int]$ExpectedStatus,
        [string[]]$MustContain,
        [scriptblock]$CurlCall
    )

    Write-Host ""
    Write-Host "=== $Name ===" -ForegroundColor Cyan

    $result = & $CurlCall
    $statusLine = $result | Select-String "HTTP/1.1 (\d+)"
    $actualStatus = if ($statusLine) { [int]$statusLine.Matches[0].Groups[1].Value } else { -1 }

    $ok = $true

    if ($actualStatus -eq $ExpectedStatus) {
        Write-Host "  Status: $actualStatus (expected $ExpectedStatus)" -ForegroundColor Green
    } else {
        Write-Host "  Status: $actualStatus (EXPECTED $ExpectedStatus)" -ForegroundColor Red
        $ok = $false
    }

    foreach ($needle in $MustContain) {
        if (($result -join "`n") -match [regex]::Escape($needle)) {
            Write-Host "  Contains '$needle': yes" -ForegroundColor Green
        } else {
            Write-Host "  Contains '$needle': NO" -ForegroundColor Red
            $ok = $false
        }
    }

    if ($ok) {
        Write-Host "  RESULT: PASS" -ForegroundColor Green
        $script:passed++
    } else {
        Write-Host "  RESULT: FAIL" -ForegroundColor Red
        $script:failed++
    }
}

Write-Host "Checking that the server responds on $baseUrl ..." -ForegroundColor Yellow
curl.exe -s -o $null -w "%{http_code}" "$baseUrl/" | Out-Null

# 1. GET /
Test-Case -Name "GET / (Home)" -ExpectedStatus 200 -MustContain @("<h1>Home</h1>", "Welcome to the Home Page") -CurlCall {
    curl.exe -s -i "$baseUrl/"
}

# 2. GET /about
Test-Case -Name "GET /about" -ExpectedStatus 200 -MustContain @("<h1>About</h1>", "Learn more about us") -CurlCall {
    curl.exe -s -i "$baseUrl/about"
}

# 3. GET /contact
Test-Case -Name "GET /contact" -ExpectedStatus 200 -MustContain @("<h1>Contact</h1>", "Get in touch") -CurlCall {
    curl.exe -s -i "$baseUrl/contact"
}

# 4. GET unknown route -> 404
Test-Case -Name "GET /unknown-route (404)" -ExpectedStatus 404 -MustContain @("Page Not Found") -CurlCall {
    curl.exe -s -i "$baseUrl/unknown-route"
}

# 5. POST /submit valid data
Test-Case -Name "POST /submit valid data" -ExpectedStatus 200 -MustContain @("Name: Alice", "Email: alice@example.com") -CurlCall {
    curl.exe -s -i -X POST -d "name=Alice&email=alice@example.com" "$baseUrl/submit"
}

# 6. POST /submit XSS attempt -> must be escaped
Test-Case -Name "POST /submit XSS attempt is escaped" -ExpectedStatus 200 -MustContain @("&lt;script&gt;") -CurlCall {
    curl.exe -s -i -X POST --data-urlencode "name=<script>alert(1)</script>" --data-urlencode "email=a@a.com" "$baseUrl/submit"
}

# 7. POST /submit empty fields -> 400
Test-Case -Name "POST /submit empty fields (400)" -ExpectedStatus 400 -MustContain @("Invalid form data") -CurlCall {
    curl.exe -s -i -X POST -d "name=&email=" "$baseUrl/submit"
}

# 8. POST /submit body over 1MB -> 413
$bigFile = Join-Path $env:TEMP "big_body.txt"
$bigValue = "a" * 1100000
"name=$bigValue" | Out-File -Encoding ascii -NoNewline $bigFile

Test-Case -Name "POST /submit body over 1MB (413)" -ExpectedStatus 413 -MustContain @("Payload Too Large") -CurlCall {
    curl.exe -s -i -X POST --data-binary "@$bigFile" -H "Content-Type: application/x-www-form-urlencoded" -H "Expect:" "$baseUrl/submit"
}

Remove-Item $bigFile -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "==================================" -ForegroundColor Yellow
Write-Host "Passed: $passed   Failed: $failed" -ForegroundColor Yellow
Write-Host "==================================" -ForegroundColor Yellow
