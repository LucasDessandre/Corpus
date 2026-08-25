' ===========================================================================
'  Corpus — garante que o servidor esta no ar e abre o site no navegador.
'  Use este para o dia a dia: um duplo clique e o sistema abre pronto.
' ===========================================================================

Set fso   = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")

pasta = fso.GetParentFolderName(WScript.ScriptFullName)

' Sobe o servidor (se ja estiver rodando, a porta 3000 fica ocupada e o
' processo extra encerra sozinho, sem atrapalhar)
shell.Run """" & pasta & "\Corpus - iniciar.vbs""", 0, False

' Espera o servidor responder antes de abrir o navegador
Set http = CreateObject("MSXML2.XMLHTTP")
pronto = False
For i = 1 To 30
    WScript.Sleep 500
    On Error Resume Next
    http.Open "GET", "http://localhost:3000/api/health", False
    http.Send
    If Err.Number = 0 And http.Status = 200 Then
        pronto = True
        Exit For
    End If
    Err.Clear
    On Error GoTo 0
Next

If pronto Then
    shell.Run "http://localhost:3000", 1, False
Else
    MsgBox "O servidor nao respondeu em 15 segundos." & vbCrLf & vbCrLf & _
           "Verifique se o MySQL esta rodando (servico MySQL84).", _
           vbExclamation, "Corpus"
End If
