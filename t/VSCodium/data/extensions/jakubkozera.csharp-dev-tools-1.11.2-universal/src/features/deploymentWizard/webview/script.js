(function() {
    'use strict';

    // Get VS Code API
    const vscode = acquireVsCodeApi();

    // State management
    let currentStep = 1;
    let deploymentData = {
        type: '',
        workflowName: '',
        environment: '',
        buildConfiguration: 'Release',
        dotnetVersion: '8.0.x'
    };

    // DOM elements
    const step1 = document.getElementById('step1');
    const step2 = document.getElementById('step2');
    const step3 = document.getElementById('step3');
    const backBtn = document.getElementById('backBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const nextBtn = document.getElementById('nextBtn');
    const createBtn = document.getElementById('createBtn');
    const yamlPreview = document.getElementById('yamlPreview');
    const copyYamlBtn = document.getElementById('copyYaml');

    // Initialize the wizard
    function init() {
        setupEventListeners();
        updateUI();
        setupFormValidation();
    }

    function setupEventListeners() {
        // Deployment type selection
        document.querySelectorAll('.option-card').forEach(card => {
            card.addEventListener('click', function() {
                selectDeploymentType(this.dataset.type);
            });
        });

        // Environment selection
        const environmentSelect = document.getElementById('environment');
        if (environmentSelect) {
            environmentSelect.addEventListener('change', function() {
                showEnvironmentConfig(this.value);
                deploymentData.environment = this.value;
                updateInstructions();
            });
        }

        // Form inputs
        const inputs = document.querySelectorAll('input, select');
        inputs.forEach(input => {
            input.addEventListener('input', function() {
                updateDeploymentData();
                validateCurrentStep();
            });
        });

        // Navigation buttons
        if (backBtn) {
            backBtn.addEventListener('click', goBack);
        }
        if (cancelBtn) {
            cancelBtn.addEventListener('click', cancelWizard);
        }
        if (nextBtn) {
            nextBtn.addEventListener('click', goNext);
        }
        if (createBtn) {
            createBtn.addEventListener('click', createDeployment);
        }
        if (copyYamlBtn) {
            copyYamlBtn.addEventListener('click', copyYamlToClipboard);
        }
    }

    function setupFormValidation() {
        // Real-time validation
        const workflowNameInput = document.getElementById('workflowName');
        if (workflowNameInput) {
            workflowNameInput.addEventListener('input', function() {
                validateWorkflowName(this);
            });
        }
    }

    function selectDeploymentType(type) {
        // Update visual selection
        document.querySelectorAll('.option-card').forEach(card => {
            card.classList.remove('selected');
        });
        document.querySelector(`[data-type="${type}"]`).classList.add('selected');

        // Update data
        deploymentData.type = type;
        
        // Enable next button
        nextBtn.disabled = false;
    }

    function showEnvironmentConfig(environment) {
        // Hide all environment configs
        document.querySelectorAll('.env-config').forEach(config => {
            config.classList.remove('active');
        });

        // Show selected environment config
        const configElement = document.getElementById(`${environment}-config`);
        if (configElement) {
            configElement.classList.add('active');
        }
    }

    function updateDeploymentData() {
        // Collect all form data
        const inputs = document.querySelectorAll('input, select');
        inputs.forEach(input => {
            if (input.type === 'checkbox') {
                const key = input.id;
                deploymentData[key] = input.checked;
            } else if (input.value) {
                const key = input.id;
                deploymentData[key] = input.value;
            }
        });
    }

    function validateCurrentStep() {
        let isValid = true;

        switch (currentStep) {
            case 1:
                isValid = deploymentData.type !== '';
                break;
            case 2:
                isValid = validateStep2();
                break;
            case 3:
                isValid = true; // Preview step is always valid
                break;
        }

        updateNavigationButtons(isValid);
        return isValid;
    }

    function validateStep2() {
        const workflowName = document.getElementById('workflowName')?.value;
        const environment = document.getElementById('environment')?.value;

        if (!workflowName || workflowName.trim().length === 0) {
            return false;
        }

        if (!environment) {
            return false;
        }

        // Validate environment-specific fields
        switch (environment) {
            case 'azure-webapp':
                const azureAppName = document.getElementById('azureAppName')?.value;
                const azureResourceGroup = document.getElementById('azureResourceGroup')?.value;
                return azureAppName && azureResourceGroup;

            case 'docker-hub':
                const dockerUsername = document.getElementById('dockerUsername')?.value;
                const dockerRepository = document.getElementById('dockerRepository')?.value;
                return dockerUsername && dockerRepository;

            case 'ftp':
                const ftpHost = document.getElementById('ftpHost')?.value;
                const ftpUsername = document.getElementById('ftpUsername')?.value;
                return ftpHost && ftpUsername;

            case 'self-hosted':
                const serverHost = document.getElementById('serverHost')?.value;
                const serverUsername = document.getElementById('serverUsername')?.value;
                return serverHost && serverUsername;

            case 'aws-elastic-beanstalk':
                const awsApplicationName = document.getElementById('awsApplicationName')?.value;
                const awsEnvironmentName = document.getElementById('awsEnvironmentName')?.value;
                return awsApplicationName && awsEnvironmentName;

            case 'google-cloud-run':
                const gcpProjectId = document.getElementById('gcpProjectId')?.value;
                const gcpServiceName = document.getElementById('gcpServiceName')?.value;
                return gcpProjectId && gcpServiceName;

            default:
                return true;
        }
    }

    function validateWorkflowName(input) {
        const value = input.value.trim();
        const parent = input.parentElement;
        
        // Remove existing error state
        parent.classList.remove('error');
        const existingError = parent.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }

        if (value.length === 0) {
            showFieldError(parent, 'Workflow name is required');
            return false;
        }

        if (!/^[a-zA-Z0-9\-_]+$/.test(value)) {
            showFieldError(parent, 'Workflow name can only contain letters, numbers, hyphens, and underscores');
            return false;
        }

        parent.classList.add('success');
        return true;
    }

    function showFieldError(parent, message) {
        parent.classList.add('error');
        const errorElement = document.createElement('small');
        errorElement.className = 'error-message';
        errorElement.textContent = message;
        parent.appendChild(errorElement);
    }

    function updateNavigationButtons(isStepValid) {
        // Navigation buttons visibility
        if (currentStep === 1) {
            backBtn.style.display = 'none';
            cancelBtn.style.display = 'block';
            nextBtn.style.display = 'block';
            createBtn.style.display = 'none';
            nextBtn.disabled = !isStepValid;
        } else if (currentStep === 2) {
            backBtn.style.display = 'block';
            cancelBtn.style.display = 'none';
            nextBtn.style.display = 'block';
            createBtn.style.display = 'none';
            backBtn.disabled = false;
            nextBtn.disabled = !isStepValid;
        } else if (currentStep === 3) {
            backBtn.style.display = 'block';
            cancelBtn.style.display = 'none';
            nextBtn.style.display = 'none';
            createBtn.style.display = 'block';
            backBtn.disabled = false;
            createBtn.disabled = false;
        }
    }

    function goNext() {
        if (!validateCurrentStep()) {
            return;
        }

        if (currentStep < 3) {
            currentStep++;
            updateUI();
            
            // Auto-generate preview when entering step 3
            if (currentStep === 3) {
                generatePreview();
            }
        }
    }

    function goBack() {
        if (currentStep > 1) {
            currentStep--;
            updateUI();
        }
    }

    function cancelWizard() {
        // Send cancel message to extension
        vscode.postMessage({
            command: 'cancel'
        });
    }

    function updateUI() {
        // Hide all steps
        step1.classList.remove('active');
        step2.classList.remove('active');
        step3.classList.remove('active');

        // Show current step
        switch (currentStep) {
            case 1:
                step1.classList.add('active');
                break;
            case 2:
                step2.classList.add('active');
                break;
            case 3:
                step3.classList.add('active');
                break;
        }

        validateCurrentStep();
    }

    function generatePreview() {
        // Update deployment data before generating
        updateDeploymentData();

        // Send message to extension
        vscode.postMessage({
            command: 'preview',
            data: deploymentData
        });
    }

    function createDeployment() {
        // Show loading state
        createBtn.innerHTML = '<span class="loading">Creating...</span>';
        createBtn.disabled = true;

        // Update deployment data before creating
        updateDeploymentData();

        // Send message to extension
        vscode.postMessage({
            command: 'createDeployment',
            data: deploymentData
        });
    }

    function copyYamlToClipboard() {
        const yamlContent = yamlPreview.textContent;
        navigator.clipboard.writeText(yamlContent).then(() => {
            // Show success feedback
            const originalText = copyYamlBtn.textContent;
            copyYamlBtn.textContent = '✅ Copied!';
            copyYamlBtn.disabled = true;
            
            setTimeout(() => {
                copyYamlBtn.textContent = originalText;
                copyYamlBtn.disabled = false;
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy YAML:', err);
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = yamlContent;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            
            copyYamlBtn.textContent = '✅ Copied!';
            setTimeout(() => {
                copyYamlBtn.textContent = '📋 Copy';
            }, 2000);
        });
    }

    function updateInstructions() {
        const secretsList = document.getElementById('secretsList');
        if (!secretsList) {
            return;
        }

        const environment = deploymentData.environment;
        const deploymentType = deploymentData.type;

        let secrets = [];

        if (deploymentType === 'github-actions') {
            switch (environment) {
                case 'azure-webapp':
                    secrets = [
                        'AZURE_WEBAPP_NAME - Your Azure Web App name',
                        'AZURE_WEBAPP_PUBLISH_PROFILE - Download from Azure portal'
                    ];
                    break;
                case 'docker-hub':
                    secrets = [
                        'DOCKER_USERNAME - Your Docker Hub username',
                        'DOCKER_PASSWORD - Your Docker Hub password or access token'
                    ];
                    break;
                case 'ftp':
                    secrets = [
                        'FTP_HOST - Your FTP server hostname',
                        'FTP_USERNAME - Your FTP username',
                        'FTP_PASSWORD - Your FTP password'
                    ];
                    break;
                case 'self-hosted':
                    secrets = [
                        'SERVER_HOST - Your server hostname or IP',
                        'SERVER_USERNAME - SSH username',
                        'SERVER_SSH_KEY - Private SSH key for authentication'
                    ];
                    break;
                case 'aws-elastic-beanstalk':
                    secrets = [
                        'AWS_ACCESS_KEY_ID - Your AWS access key',
                        'AWS_SECRET_ACCESS_KEY - Your AWS secret key'
                    ];
                    break;
                case 'google-cloud-run':
                    secrets = [
                        'GCP_SA_KEY - Service account key JSON (base64 encoded)'
                    ];
                    break;
            }
        } else if (deploymentType === 'azure-pipelines') {
            switch (environment) {
                case 'azure-webapp':
                    secrets = [
                        'Create an Azure Resource Manager service connection',
                        'Set azureServiceConnection variable to the connection name'
                    ];
                    break;
                case 'docker-hub':
                    secrets = [
                        'Create a Docker Registry service connection',
                        'Set dockerRegistryServiceConnection variable'
                    ];
                    break;
                case 'ftp':
                    secrets = [
                        'Create an FTP service connection',
                        'Set ftpServiceConnection variable'
                    ];
                    break;
                case 'self-hosted':
                    secrets = [
                        'Create an SSH service connection',
                        'Set sshServiceConnection variable'
                    ];
                    break;
            }
        }

        // Update the secrets list
        secretsList.innerHTML = '';
        secrets.forEach(secret => {
            const li = document.createElement('li');
            li.textContent = secret;
            secretsList.appendChild(li);
        });
    }

    // Listen for messages from the extension
    window.addEventListener('message', event => {
        const message = event.data;
        
        switch (message.command) {
            case 'showPreview':
                showYamlPreview(message.yaml);
                break;
        }
    });

    function showYamlPreview(yaml) {
        // Show the YAML with basic syntax highlighting
        yamlPreview.innerHTML = highlightYaml(yaml);
    }

    function highlightYaml(yaml) {
        // Basic YAML syntax highlighting
        return yaml
            .replace(/^(\s*)([a-zA-Z_-]+):/gm, '$1<span class="yaml-keyword">$2</span>:')
            .replace(/:\s*([^#\n\r]+)/g, ': <span class="yaml-string">$1</span>')
            .replace(/#.*/g, '<span class="yaml-comment">$&</span>')
            .replace(/\$\{\{[^}]+\}\}/g, '<span class="yaml-variable">$&</span>');
    }

    // Initialize when DOM is loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
