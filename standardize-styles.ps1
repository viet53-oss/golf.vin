# PowerShell script to standardize all font sizes to 14pt and spacing to 1
# Run from the golf-v3 directory

$files = Get-ChildItem -Path "app","components" -Filter "*.tsx" -Recurse

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    
    # Font size replacements - all to 14pt
    $content = $content -replace 'text-\[10pt\]', 'text-[14pt]'
    $content = $content -replace 'text-\[11pt\]', 'text-[14pt]'
    $content = $content -replace 'text-\[12pt\]', 'text-[14pt]'
    $content = $content -replace 'text-\[13pt\]', 'text-[14pt]'
    $content = $content -replace 'text-\[15pt\]', 'text-[14pt]'
    $content = $content -replace 'text-\[16pt\]', 'text-[14pt]'
    $content = $content -replace 'text-\[18pt\]', 'text-[14pt]'
    
    # Remove responsive font sizes (sm:text-*)
    $content = $content -replace 'sm:text-\[10pt\]', ''
    $content = $content -replace 'sm:text-\[11pt\]', ''
    $content = $content -replace 'sm:text-\[12pt\]', ''
    $content = $content -replace 'sm:text-\[13pt\]', ''
    $content = $content -replace 'sm:text-\[14pt\]', ''
    $content = $content -replace 'sm:text-\[15pt\]', ''
    $content = $content -replace 'sm:text-\[16pt\]', ''
    $content = $content -replace 'sm:text-\[18pt\]', ''
    
    # Horizontal padding replacements - all to 1
    $content = $content -replace '\bpx-2\b', 'px-1'
    $content = $content -replace '\bpx-3\b', 'px-1'
    $content = $content -replace '\bpx-4\b', 'px-1'
    $content = $content -replace '\bpx-6\b', 'px-1'
    $content = $content -replace '\bpx-8\b', 'px-1'
    $content = $content -replace '\bsm:px-2\b', ''
    $content = $content -replace '\bsm:px-3\b', ''
    $content = $content -replace '\bsm:px-4\b', ''
    
    # Individual padding
    $content = $content -replace '\bpl-3\b', 'pl-1'
    $content = $content -replace '\bpr-3\b', 'pr-1'
    $content = $content -replace '\bpr-7\b', 'pr-1'
    
    # Horizontal margin replacements - all to 1
    $content = $content -replace '\bmx-2\b', 'mx-1'
    $content = $content -replace '\bmx-3\b', 'mx-1'
    $content = $content -replace '\bmx-4\b', 'mx-1'
    $content = $content -replace '\bmx-6\b', 'mx-1'
    
    # Clean up multiple spaces
    $content = $content -replace '\s+', ' '
    $content = $content -replace ' "', '"'
    
    Set-Content -Path $file.FullName -Value $content -NoNewline
    Write-Host "Updated: $($file.FullName)"
}

Write-Host "`nAll files updated successfully!"
