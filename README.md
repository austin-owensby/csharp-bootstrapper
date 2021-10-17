# csharp-bootstrapper README

C# Bootstrapper is currently a work in progress extension.

The goal is to add the ability to create a basic backend CRUD API as well as a frontend typescript service to handle the requests based off of existing C# models.

In addition it will have configurations allowing the API generation to be flexible and work with multiple different architect styles.

## Features

## Requirements

1. Node package manager

## Contribution

* `csharp-bootstrapper.convert-model`: Converts the C# model to a typescript model at the configured folder.

* `csharp-boostrapper.boostrap-crud` Generates a CRUD workflow based on the configurations.

* `csharp-bootstrapper.settings` Navigates to the extension settings.

* `csharp-bootstrapper.settings-gui` Displays a WebView GUI with the extension settings.

### Environment Setup

How do we set up the environement?
1. Run `npm install`

### Conventions

What coding conventions?

### Testing

How to test the extension?

## Extension Settings

This extension contributes the following settings:

### Frontend

#### Model

* `csharp-bootstrapper.frontend.model.directory`: The directory that frontend typescript Model should be added.

### Backend

#### Controller

* `csharp-bootstrapper.backend.controller.directory` The directory that backend C# Controller should be added.
* `csharp-bootstrapper.backend.controller.namespace` The namespace of the backend C# Controller.

#### Service

* `csharp-bootstrapper.backend.service.directory` The directory that backend C# Service should be added.
* `csharp-bootstrapper.backend.service.namespace` The namespace of the backend C# Service.

##### Interface
* `csharp-bootstrapper.backend.service.interface.directory` The directory that backend C# Service Interface should be added.
* `csharp-bootstrapper.backend.service.interface.namespace` The namespace of the backend C# Service Interface.

#### DB Context

* `csharp-bootstrapper.backend.dbcontext.name` The name of the Database Context class.
* `csharp-bootstrapper.backend.dbcontext.namespace` The namespace of the Database Context class.

## Known Issues

WIP extension :)

## Release Notes

### 0.0.0

Initial testing of publishing the extension

### 0.0.1 - 0.0.4

Scaffolding out of project. Added simple view and command to generate tpyescript template at a configured path.
