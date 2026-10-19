VIVAPLAY PARA WINDOWS — BUILD NA NUVEM

COMPILAR SEM INSTALAR DEPENDÊNCIAS NO SEU COMPUTADOR
Este projeto contém um workflow de GitHub Actions que usa um ambiente Windows na nuvem para gerar o instalador .exe.

PASSOS
1. Entre em https://github.com/ e crie uma conta, se ainda não tiver.
2. Crie um repositório novo chamado VivaPlay-Windows.
3. Envie os arquivos e pastas deste ZIP para o repositório.
   Para criar o workflow pelo site do GitHub, clique em Add file > Create new file e use o caminho:
   .github/workflows/build-windows.yml
   Copie o conteúdo do arquivo com esse nome que está dentro do ZIP e faça commit na branch main.
4. No repositório, abra a aba Actions.
5. Se aparecer a solicitação inicial para habilitar Actions, aceite.
6. Abra “Build VivaPlay for Windows” e clique em “Run workflow”.
7. Espere a execução ficar verde.
8. Na página da execução, vá até Artifacts e baixe “VivaPlay-Windows-Installer”.
9. Extraia o ZIP do artifact; dentro estará o instalador .exe.

O workflow também inicia automaticamente quando houver um push para a branch main.

DESEMPENHO
- O HLS.js agora é incluído como dependência do aplicativo, em vez de ser carregado do CDN em cada abertura.
- A configuração HLS usa um buffer mais moderado para equilibrar início e estabilidade.
- A velocidade final depende muito da conexão e do servidor da transmissão; nenhuma configuração consegue corrigir um stream lento na origem.

COMPILAÇÃO LOCAL OPCIONAL
No Windows com Node.js LTS instalado, execute build-windows.bat.

SEGURANÇA E CONTEÚDO
Use apenas playlists e streams aos quais você tem autorização de acesso. O aplicativo não inclui canais, credenciais nem conteúdo.
