const vscode = acquireVsCodeApi();

window.addEventListener("load", main);

function main() {
  // All configuration inputs should have the 'config' class in order to work in the WebView
  const inputs = document.getElementsByClassName("config");

  // Setup a change event listerner for each config input
  for(let input of inputs){
    input.addEventListener("change", handleConfigChange);
  }

  // All tabs should have the 'tabs' class in order to save when realoading the WebView
  const tabs = document.getElementsByClassName("tabs");

  // Setup a change event listerner for each tab
  for(let tab of tabs){
    tab.addEventListener("click", handleTabClick);
  }
}

function handleConfigChange(event) {
  // When the config input has been updated, let the extension know of the change
  // The id of the input should be formatted similiar to the config section
  vscode.postMessage({
    config: `${event.target.id.replaceAll('-','.')}`,
    value: event.target.value
  });
}

function handleTabClick(event){
  // When the config input has been updated, let the extension know of the change
  // The id of the input should be formatted similiar to the config section
  vscode.postMessage({
    config: `${event.target.id}`,
    value: ''
  });
}
