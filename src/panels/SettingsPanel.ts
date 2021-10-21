import * as vscode from 'vscode';
import { getUri } from '../utilities/getUri';

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

  private async setWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri) {
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

    const shiki = require('shiki');

    const codeBlock = await shiki
      .getHighlighter({
        theme: 'dark-plus'
      })
      .then((highlighter: any) => {
        return highlighter.codeToHtml(`namespace Project.Models
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
}`, 'csharp');
      });

      this.panel.webview.html = /*html*/ `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width,initial-scale=1.0">
          <script type="module" src="${toolkitUri}"></script>
          <script type="module" src="${mainUri}"></script>
          <title>C# Bootstrapper Extension Settings</title>
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
                <h2>DB Context</h2>
                <vscode-text-field id="backend-dbcontext-name" class="config" value="${vscode.workspace.getConfiguration().get("csharp-bootstrapper.backend.dbcontext.name")}">DBContext Name</vscode-text-field>
                <vscode-text-field id="backend-dbcontext-namespace" class="config" value="${vscode.workspace.getConfiguration().get("csharp-bootstrapper.backend.dbcontext.namespace")}">DBContext Namespace</vscode-text-field>
                <h2>Model Example</h2>
                ${codeBlock}
              </section>
            </vscode-panel-view>
            <vscode-panel-view id="view-service">
              <section style="display: flex; flex-direction: column; width: 100%;">
                <h1 style="margin-top: 0;">C# Service Settings</h1>
                <h2>Service</h2>
                <vscode-text-field id="backend-service-directory" class="config" value="${vscode.workspace.getConfiguration().get("csharp-bootstrapper.backend.service.directory")}">Directory</vscode-text-field>
                <vscode-text-field id="backend-service-namespace" class="config" value="${vscode.workspace.getConfiguration().get("csharp-bootstrapper.backend.service.namespace")}">Namespace</vscode-text-field> 
                <h2>Service Interface</h2>
                <vscode-text-field id="backend-service-interface-directory" class="config" value="${vscode.workspace.getConfiguration().get("csharp-bootstrapper.backend.service.interface.directory")}">Directory</vscode-text-field>
                <vscode-text-field id="backend-service-interface-namespace" class="config" value="${vscode.workspace.getConfiguration().get("csharp-bootstrapper.backend.service.interface.namespace")}">Namespace</vscode-text-field>
              </section>
            </vscode-panel-view>
            <vscode-panel-view id="view-controller">        
              <section style="display: flex; flex-direction: column; width: 100%;">
                <h1 style="margin-top: 0;">C# Controller Settings</h1>
                <vscode-text-field id="backend-controller-directory" class="config" value="${vscode.workspace.getConfiguration().get("csharp-bootstrapper.backend.controller.directory")}">Directory</vscode-text-field>
                <vscode-text-field id="backend-controller-namespace" class="config" value="${vscode.workspace.getConfiguration().get("csharp-bootstrapper.backend.controller.namespace")}">Namespace</vscode-text-field>
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
              </section>
            </vscode-panel-view>
          </vscode-panels>
        </body>
      </html>`;
  }

  private setWebviewMessageListener(webview: vscode.Webview) {
    webview.onDidReceiveMessage(
      async (message: any) => {
        const config = message.config;
        const value = message.value;

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
