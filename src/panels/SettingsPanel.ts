import * as vscode from 'vscode';
import * as shiki from 'shiki';
import * as generate from  '../utilities/generateFiles';
import { getUri } from '../utilities/getUri';
import { arrangeIntoTree, printTree } from '../utilities/helpers';
import { CSharp } from '../utilities/csharp';

export class SettingsPanel {
  public static currentPanel: SettingsPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private readonly extensionUri: vscode.Uri;
  private disposables: vscode.Disposable[] = [];

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this.panel = panel;
    this.extensionUri = extensionUri;
    this.panel.onDidDispose(this.dispose, null, this.disposables);
    this.setWebviewContent(this.panel.webview, this.extensionUri);
    this.setWebviewMessageListener(this.panel.webview);
  }

  public static render(extensionUri: vscode.Uri) {
    if (SettingsPanel.currentPanel) {
      SettingsPanel.currentPanel.panel.reveal(vscode.ViewColumn.One);
    } else {
      const panel = vscode.window.createWebviewPanel("settings", "C# Bootstrapper Extension Settings", vscode.ViewColumn.One, {
        enableScripts: true,
      });

      SettingsPanel.currentPanel = new SettingsPanel(panel, extensionUri);
    }
  }

  public dispose() {
    SettingsPanel.currentPanel = undefined;

    this.panel.dispose();

    while (this.disposables.length) {
      const disposable = this.disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }

  // Generates the html for the webview and sets it
  private async setWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri) {    
    // Generate code block examples
    const documentText = `namespace Project.Models
{
    public class Student
    {
        public int StudentID { get; set; }
        public string StudentName { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public byte[]  Photo { get; set; }
        public decimal Height { get; set; }
        public float Weight { get; set; }
        public Grade  Grade { get; set; }
    }
}`;

    const modelCodeBlock = await shiki
      .getHighlighter({
        theme: 'dark-plus'
      })
      .then((highlighter: any) => {
        return highlighter.codeToHtml(documentText, 'csharp');
    });

    const parsedClass = CSharp.parseClasses(documentText)[0];

    const serviceInterfaceCodeBlock = await shiki
      .getHighlighter({
        theme: 'dark-plus'
      })
      .then((highlighter: any) => {
        return highlighter.codeToHtml(generate.generateBackendServiceInterface(parsedClass, 'Project.Models'), 'csharp');
    });

    const serviceCodeBlock = await shiki
      .getHighlighter({
        theme: 'dark-plus'
      })
      .then((highlighter: any) => {
        return highlighter.codeToHtml(generate.generateBackendService(parsedClass, 'Project.Models'), 'csharp');
    });

    const controllerCodeBlock = await shiki
      .getHighlighter({
        theme: 'dark-plus'
      })
      .then((highlighter: any) => {
        return highlighter.codeToHtml(generate.generateController(parsedClass, 'Project.Models'), 'csharp');
    });
    
    const frontendModelCodeBlock = await shiki
      .getHighlighter({
        theme: 'dark-plus'
      })
      .then((highlighter: any) => {
        return highlighter.codeToHtml(generate.generateTypescriptClass(parsedClass), 'typescript');
    });

    // Generate the folder structure for the generated files
    let frontendModelDir: string[] = vscode.workspace.getConfiguration().get<string>("csharp-bootstrapper.frontend.model.directory")?.split(/[/\\]+/) ?? [];
    frontendModelDir.push('Student.ts');
    let controllerDir: string[] = vscode.workspace.getConfiguration().get<string>("csharp-bootstrapper.backend.controller.directory")?.split(/[/\\]+/) ?? [];
    controllerDir.push('StudentsController.cs');
    let iserviceDir: string[] = vscode.workspace.getConfiguration().get<string>("csharp-bootstrapper.backend.service.interface.directory")?.split(/[/\\]+/) ?? [];
    iserviceDir.push('IStudentService.cs');
    let serviceDir: string[] = vscode.workspace.getConfiguration().get<string>("csharp-bootstrapper.backend.service.directory")?.split(/[/\\]+/) ?? [];
    serviceDir.push('StudentService.cs');

    const paths: string[][] = new Array(frontendModelDir, controllerDir, iserviceDir, serviceDir);
    
    const tree: any[] = arrangeIntoTree(paths);

    let treeHtml: string = '<ul>';

    for (let branch of tree)
    {
      treeHtml += printTree(branch);
    }

    treeHtml += '</ul>';

    // Produce the html for the web view
    const toolkitUri = getUri(webview, extensionUri, [
      "node_modules",
      "@vscode",
      "webview-ui-toolkit",
      "dist",
      "toolkit.js",
    ]);
  
    const mainUri = getUri(webview, extensionUri, ["src", "media","settingsGui.js"]);

    // Each input should have the class "config"
    // Also an id formatted similiar to the config section
    // Ex. config section = csharp-bootstrapper.backend.service.directory
    // <vscode-text-field id="backend-service-directory" class="config" value="${vscode.workspace.getConfiguration().get("csharp-bootstrapper.backend.service-directory")}">Service Directory</vscode-text-field>
    this.panel.webview.html = /*html*/ `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width,initial-scale=1.0">
          <script type="module" src="${toolkitUri}"></script>
          <script type="module" src="${mainUri}"></script>
          <title>C# Bootstrapper Extension Settings</title>
          <style>
            ul {
                list-style: none;
            }

            ul li:before
            {
                content: '📁';
                margin: 0 1em;
            }

            ul li.file:before{
              content: '🗎';
            }
          </style>
        </head>
        <body>
          <vscode-panels>
            <vscode-panel-tab id="general">General</vscode-panel-tab>
            <vscode-panel-tab id="service">Service</vscode-panel-tab>
            <vscode-panel-tab id="controller">Controller</vscode-panel-tab>
            <vscode-panel-tab id="frontend-service">Frontend Service</vscode-panel-tab>
            <vscode-panel-tab id="frontend-model">Frontend Model</vscode-panel-tab>
            <vscode-panel-view id="view-general"> 
              <section style="display: flex; flex-direction: column; width: 100%;">
                <h1 style="margin-top: 0;">General Settings</h1>
                <h2>Directories</h2>
                <vscode-text-field id="frontend-model-directory" class="config" value="${vscode.workspace.getConfiguration().get("csharp-bootstrapper.frontend.model.directory")}">Frontend Model</vscode-text-field>
                <vscode-text-field id="backend-controller-directory" class="config" value="${vscode.workspace.getConfiguration().get("csharp-bootstrapper.backend.controller.directory")}">Controller</vscode-text-field>
                <vscode-text-field id="backend-service-interface-directory" class="config" value="${vscode.workspace.getConfiguration().get("csharp-bootstrapper.backend.service.interface.directory")}">Service Interface</vscode-text-field>
                <vscode-text-field id="backend-service-directory" class="config" value="${vscode.workspace.getConfiguration().get("csharp-bootstrapper.backend.service.directory")}">Backend Service</vscode-text-field>
                ${treeHtml}
                <h2>DB Context</h2>
                <vscode-text-field id="backend-dbcontext-name" class="config" value="${vscode.workspace.getConfiguration().get("csharp-bootstrapper.backend.dbcontext.name")}">DBContext Name</vscode-text-field>
                <vscode-text-field id="backend-dbcontext-namespace" class="config" value="${vscode.workspace.getConfiguration().get("csharp-bootstrapper.backend.dbcontext.namespace")}">DBContext Namespace</vscode-text-field>
                <h2>Model Example</h2>
                ${modelCodeBlock}
              </section>
            </vscode-panel-view>
            <vscode-panel-view id="view-service">
              <section style="display: flex; flex-direction: column; width: 100%;">
                <h1 style="margin-top: 0;">C# Service Settings</h1>
                <h2>Service</h2>
                <vscode-text-field id="backend-service-directory" class="config" value="${vscode.workspace.getConfiguration().get("csharp-bootstrapper.backend.service.directory")}">Directory</vscode-text-field>
                <vscode-text-field id="backend-service-namespace" class="config" value="${vscode.workspace.getConfiguration().get("csharp-bootstrapper.backend.service.namespace")}">Namespace</vscode-text-field> 
                ${serviceCodeBlock}
                <h2>Service Interface</h2>
                <vscode-text-field id="backend-service-interface-directory" class="config" value="${vscode.workspace.getConfiguration().get("csharp-bootstrapper.backend.service.interface.directory")}">Directory</vscode-text-field>
                <vscode-text-field id="backend-service-interface-namespace" class="config" value="${vscode.workspace.getConfiguration().get("csharp-bootstrapper.backend.service.interface.namespace")}">Namespace</vscode-text-field>
                ${serviceInterfaceCodeBlock}
              </section>
            </vscode-panel-view>
            <vscode-panel-view id="view-controller">        
              <section style="display: flex; flex-direction: column; width: 100%;">
                <h1 style="margin-top: 0;">C# Controller Settings</h1>
                <vscode-text-field id="backend-controller-directory" class="config" value="${vscode.workspace.getConfiguration().get("csharp-bootstrapper.backend.controller.directory")}">Directory</vscode-text-field>
                <vscode-text-field id="backend-controller-namespace" class="config" value="${vscode.workspace.getConfiguration().get("csharp-bootstrapper.backend.controller.namespace")}">Namespace</vscode-text-field>
                ${controllerCodeBlock}
              </section>
            </vscode-panel-view>
            <vscode-panel-view id="view-frontend-service">
              <section style="display: flex; flex-direction: column; width: 100%;">
                <h1 style="margin-top: 0;">Typescript Frontend Service Settings</h1>
              </section>
            </vscode-panel-view>
            <vscode-panel-view id="view-frontend-model">
              <section style="display: flex; flex-direction: column; width: 100%;">
                <h1 style="margin-top: 0;">Typescript Frontend Model Settings</h1>
                <vscode-text-field id="frontend-model-directory" class="config" value="${vscode.workspace.getConfiguration().get("csharp-bootstrapper.frontend.model.directory")}">Directory</vscode-text-field>
                ${frontendModelCodeBlock}
              </section>
            </vscode-panel-view>
          </vscode-panels>
        </body>
      </html>`;
  }

  // Handles events from the webview javascript
  private setWebviewMessageListener(webview: vscode.Webview) {
    webview.onDidReceiveMessage(
      async (message: any) => {
        const config: string = message.config;
        const value: string | undefined = message.value ? message.value : undefined;

        // Update the configuration value
        await vscode.workspace.getConfiguration('csharp-bootstrapper').update(config, value);
        
        // Update html with the new values (That way you can navigate away from the WebView and come back and see the correct values)
        this.setWebviewContent(webview, this.extensionUri);
      },
      undefined,
      this.disposables
    );
  }
}
