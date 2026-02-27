
$sectorsJson = @"
[
    {"name": "반도체", "stocks": ["005930", "005935", "000660", "232140", "403870", "089030", "166090", "067310", "084370", "031980", "319660", "039440", "003160", "101490", "039030", "240810", "095340", "131970", "036810", "027740", "399720", "158430", "036930", "042700", "281820", "074600", "036200", "064760"]},
    {"name": "이차전지", "stocks": ["006400", "373220", "051910", "005490", "086520", "247540", "066970", "003670", "121600", "450080", "091580", "005420"]},
    {"name": "바이오", "stocks": ["009420", "950160", "128940", "028300", "298380", "389470", "220100", "141080", "196170", "039200"]},
    {"name": "자동차", "stocks": ["005380", "005385", "012330", "000270", "009150", "009155"]},
    {"name": "로봇", "stocks": ["277810", "117730", "475400", "466100", "322000", "010060"]},
    {"name": "엔터", "stocks": ["352820", "122870", "035900", "041510", "002710", "376300", "035720", "035420"]}
]
"@
$sectors = ConvertFrom-Json $sectorsJson

$r = Invoke-RestMethod -Uri "https://money-fact-server.onrender.com/api/snapshot" -TimeoutSec 40
$allAnalysisKeys = $r.allAnalysis.psobject.properties.name

$missing = @()
foreach($sec in $sectors) {
    foreach($code in $sec.stocks) {
        if ($allAnalysisKeys -notcontains $code) {
            $missing += [PSCustomObject]@{
                Sector = $sec.name
                Code = $code
            }
        }
    }
}

if ($missing.Count -eq 0) {
    Write-Host "SUCCESS: All sector stocks are analyzed in the server!"
} else {
    Write-Host "MISSING STOCKS FOUND:"
    $missing | Format-Table -AutoSize
}
