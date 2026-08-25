' ===========================================================================
'  Corpus — inicia o servidor sem abrir janela de terminal.
'
'  O WScript.Shell com o terceiro parametro 0 executa o processo de forma
'  totalmente oculta. E o que permite usar o sistema sem ver terminal algum.
'
'  Fica na pasta Inicializar do Windows, entao roda sozinho quando voce liga
'  o computador. Tambem pode ser aberto com duplo clique.
' ===========================================================================

Set fso   = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")

pasta = fso.GetParentFolderName(WScript.ScriptFullName) & "\api"

' Procura o node em varios lugares, para funcionar em qualquer maquina
node = ""
caminhos = Array( _
    shell.ExpandEnvironmentStrings("%ProgramFiles%") & "\nodejs\node.exe", _
    shell.ExpandEnvironmentStrings("%ProgramFiles(x86)%") & "\nodejs\node.exe", _
    shell.ExpandEnvironmentStrings("%LOCALAPPDATA%") & "\Programs\nodejs\node.exe", _
    shell.ExpandEnvironmentStrings("%APPDATA%") & "\npm\node.exe" )

For Each c In caminhos
    If node = "" And fso.FileExists(c) Then node = c
Next

' Ultimo recurso: confiar no PATH do sistema
If node = "" Then node = "node"

If Not fso.FolderExists(pasta) Then
    MsgBox "Pasta 'api' nao encontrada em:" & vbCrLf & pasta, vbCritical, "Corpus"
    WScript.Quit
End If

If Not fso.FolderExists(pasta & "\node_modules") Then
    MsgBox "As dependencias nao foram instaladas." & vbCrLf & vbCrLf & _
           "Execute o arquivo INSTALAR.bat primeiro.", vbExclamation, "Corpus"
    WScript.Quit
End If

shell.CurrentDirectory = pasta
' 0 = janela oculta ; False = nao espera terminar
shell.Run """" & node & """ server.js", 0, False
