$password = "@Mm20120012012001"
$server = "root@62.72.29.136"
$remoteFile = "/root/Qudrat/server/duplicate-questions-by-group.txt"
$localFile = "duplicate-questions-by-group.txt"

# Convert password to secure string
$securePassword = ConvertTo-SecureString $password -AsPlainText -Force
$credential = New-Object System.Management.Automation.PSCredential("root", $securePassword)

# Try using SCP with sshpass equivalent
# On Windows, we can use plink or create a simple script
Write-Host "Downloading file from server..."
Write-Host "Remote: $server`:$remoteFile"
Write-Host "Local: $localFile"

# Method 1: Try using ssh with expect-like behavior
# Since Windows doesn't have sshpass, we'll use a different approach
$command = "scp $server`:$remoteFile $localFile"

Write-Host "`nPlease run this command manually and enter the password when prompted:"
Write-Host $command -ForegroundColor Yellow
Write-Host "`nOr use WinSCP/FileZilla to download the file."

