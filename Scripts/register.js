const nameInput = document.getElementById('nameInput');
const surnameInput = document.getElementById('surnameInput');
const emailInput = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');
const confirmPasswordInput = document.getElementById('confirmPasswordInput');
const submitBtn = document.getElementById('submitBtn');
const formStatus = document.getElementById('formStatus');

const roleTouristOption = document.getElementById('roleTouristOption');
const roleBusinessOption = document.getElementById('roleBusinessOption');
const businessNameGroup = document.getElementById('businessNameGroup');
const businessNameInput = document.getElementById('businessNameInput');

function isBusinessSelected() {
    return document.querySelector('input[name="user_role"]:checked').value === 'business_owner';
}

function toggleBusinessField() {
    roleTouristOption.classList.toggle('selected', !isBusinessSelected());
    roleBusinessOption.classList.toggle('selected', isBusinessSelected());

    if (isBusinessSelected()) {
        businessNameGroup.classList.add('visible');
        businessNameInput.setAttribute('required', 'required');
    } else {
        businessNameGroup.classList.remove('visible');
        businessNameInput.removeAttribute('required');
        clearFieldError(businessNameInput, document.getElementById('businessNameError'));
    }
}

document.querySelectorAll('input[name="user_role"]').forEach(radio => {
    radio.addEventListener('change', toggleBusinessField);
});

function showFieldError(input, errorEl, message) {
    input.classList.add('field-error');
    if (message) errorEl.textContent = message;
    errorEl.classList.add('visible');
}

function clearFieldError(input, errorEl) {
    input.classList.remove('field-error');
    errorEl.classList.remove('visible');
}

function clearAllErrors() {
    [
        [nameInput, document.getElementById('nameError')],
        [surnameInput, document.getElementById('surnameError')],
        [businessNameInput, document.getElementById('businessNameError')],
        [emailInput, document.getElementById('emailError')],
        [passwordInput, document.getElementById('passwordError')],
        [confirmPasswordInput, document.getElementById('confirmPasswordError')]
    ].forEach(([input, err]) => clearFieldError(input, err));
    formStatus.className = 'form-status';
    formStatus.textContent = '';
}

function validateForm() {
    clearAllErrors();
    let valid = true;

    if (!nameInput.value.trim()) {
        showFieldError(nameInput, document.getElementById('nameError'));
        valid = false;
    }
    if (!surnameInput.value.trim()) {
        showFieldError(surnameInput, document.getElementById('surnameError'));
        valid = false;
    }
    if (isBusinessSelected() && !businessNameInput.value.trim()) {
        showFieldError(businessNameInput, document.getElementById('businessNameError'));
        valid = false;
    }
    if (!emailInput.value.trim() || !emailInput.value.includes('@')) {
        showFieldError(emailInput, document.getElementById('emailError'));
        valid = false;
    }
    if (passwordInput.value.length < 6) {
        showFieldError(passwordInput, document.getElementById('passwordError'));
        valid = false;
    }
    if (confirmPasswordInput.value !== passwordInput.value) {
        showFieldError(confirmPasswordInput, document.getElementById('confirmPasswordError'));
        valid = false;
    }

    return valid;
}

document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    const fullName = `${nameInput.value.trim()} ${surnameInput.value.trim()}`.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    // Role values must match the Postgres enum exactly: tourist / business / admin
    const role = document.querySelector('input[name="user_role"]:checked').value;
    const businessName = role === 'business_owner' ? businessNameInput.value.trim() : null;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating account...';

    const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: fullName,
                role: role,
                business_name: businessName
            }
        }
    });

    submitBtn.disabled = false;
    submitBtn.textContent = 'Create Account';

    if (error) {
        formStatus.className = 'form-status error';
        formStatus.textContent = error.message;
        return;
    }

    formStatus.className = 'form-status success';
    formStatus.textContent = 'Account created! Check your email to confirm, then log in.';
    showToast('Account created! Check your email to confirm your address.', 'success', 5000);

    setTimeout(() => { window.location.href = 'login.html'; }, 2500);
});