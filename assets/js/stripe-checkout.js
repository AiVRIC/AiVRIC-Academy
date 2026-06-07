/**
 * AiVRIC CloudSignals commercialization wiring.
 *
 * Public pricing buttons call the AiVRIC Control Plane to create Stripe
 * Checkout sessions. The website never stores Stripe secrets or raw price IDs.
 */

(function() {
    'use strict';

    const CONFIG = {
        controlPlaneApiUrl: 'https://control-panel.aivric.com',
        defenseAppUrl: 'https://gcp-defense.aivric.com',
        successUrl: window.location.origin + '/success.html',
        cancelUrl: window.location.origin + window.location.pathname,
        contactUrl: window.location.origin + '/contact.html'
    };

    function normalizeConfig() {
        if (!CONFIG.controlPlaneApiUrl || CONFIG.controlPlaneApiUrl.includes('%%')) {
            CONFIG.controlPlaneApiUrl = 'https://control-panel.aivric.com';
        }
        if (!CONFIG.defenseAppUrl || CONFIG.defenseAppUrl.includes('%%')) {
            CONFIG.defenseAppUrl = 'https://gcp-defense.aivric.com';
        }
        CONFIG.controlPlaneApiUrl = CONFIG.controlPlaneApiUrl.replace(/\/$/, '');
    }

    function getStoredTenantId() {
        return (
            localStorage.getItem('cloudsignals_tenant_id') ||
            localStorage.getItem('aivric_tenant_id') ||
            localStorage.getItem('tenant_id') ||
            null
        );
    }

    function getStoredEmail() {
        return (
            localStorage.getItem('cloudsignals_customer_email') ||
            localStorage.getItem('aivric_customer_email') ||
            localStorage.getItem('customer_email') ||
            null
        );
    }

    function setButtonLoading(button, loading) {
        if (!button) return;
        if (loading) {
            button.dataset.originalText = button.textContent;
            button.disabled = true;
            button.textContent = 'Preparing checkout...';
            return;
        }
        button.disabled = false;
        button.textContent = button.dataset.originalText || button.textContent;
    }

    async function createCheckoutSession(button) {
        const packageId = button.getAttribute('data-package-id');
        const billingInterval = button.getAttribute('data-billing-interval') || 'monthly';
        if (!packageId) {
            showError('This pricing option is missing a package identifier.');
            return;
        }

        setButtonLoading(button, true);
        try {
            const response = await fetch(`${CONFIG.controlPlaneApiUrl}/api/v1/commercialization/stripe/checkout-session`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    package_id: packageId,
                    billing_interval: billingInterval,
                    tenant_id: getStoredTenantId(),
                    customer_email: getStoredEmail(),
                    success_url: `${CONFIG.successUrl}?package=${encodeURIComponent(packageId)}&checkout=success`,
                    cancel_url: `${CONFIG.cancelUrl}?package=${encodeURIComponent(packageId)}&checkout=cancelled`,
                    allow_promotion_codes: true,
                    metadata: {
                        source: 'aivric_website',
                        channel: 'public_pricing',
                        package_id: packageId
                    }
                })
            });

            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(payload.detail || payload.message || 'Unable to start checkout.');
            }
            if (!payload.checkout_url) {
                throw new Error('Checkout URL was not returned.');
            }
            window.location.href = payload.checkout_url;
        } catch (error) {
            console.error('CloudSignals checkout error:', error);
            showError(error.message || 'Unable to start checkout. Please try again.');
            setButtonLoading(button, false);
        }
    }

    function startFreePlan(button) {
        const packageId = button.getAttribute('data-package-id') || 'pkg-cloudsignals-free';
        const url = new URL('/sign-up', CONFIG.defenseAppUrl);
        url.searchParams.set('plan', packageId);
        url.searchParams.set('source', 'aivric_website');
        window.location.href = url.toString();
    }

    function contactSales(button) {
        const packageId = button.getAttribute('data-package-id') || 'pkg-cloudsignals-enterprise';
        const url = new URL(CONFIG.contactUrl);
        url.searchParams.set('package', packageId);
        url.searchParams.set('source', 'cloudsignals_pricing');
        window.location.href = url.toString();
    }

    async function redirectToCustomerPortal(button) {
        const stripeCustomerId = localStorage.getItem('stripe_customer_id');
        if (!stripeCustomerId) {
            showError('Customer portal is available after your billing account is active.');
            return;
        }
        setButtonLoading(button, true);
        try {
            const response = await fetch(`${CONFIG.controlPlaneApiUrl}/api/v1/commercialization/stripe/customer-portal-session`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    stripe_customer_id: stripeCustomerId,
                    return_url: window.location.origin + '/account.html'
                })
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(payload.detail || payload.message || 'Unable to open the billing portal.');
            }
            window.location.href = payload.portal_url;
        } catch (error) {
            console.error('Customer portal error:', error);
            showError(error.message || 'Unable to open the billing portal.');
            setButtonLoading(button, false);
        }
    }

    function showError(message) {
        showNotification('Error', message, '#dc3545');
    }

    function showSuccess(message) {
        showNotification('Success', message, '#098f72');
    }

    function showNotification(title, message, background) {
        const notice = document.createElement('div');
        const heading = document.createElement('strong');
        const body = document.createElement('span');

        notice.className = 'stripe-notification';
        notice.style.cssText = [
            'position:fixed',
            'top:20px',
            'right:20px',
            `background:${background}`,
            'color:#fff',
            'padding:15px 20px',
            'border-radius:8px',
            'box-shadow:0 12px 30px rgba(0,0,0,0.25)',
            'z-index:10000',
            'max-width:340px',
            'line-height:1.4',
            'animation:stripeSlideIn 0.25s ease-out'
        ].join(';');
        heading.textContent = title;
        body.textContent = message;
        body.style.display = 'block';
        body.style.marginTop = '4px';
        notice.appendChild(heading);
        notice.appendChild(body);
        document.body.appendChild(notice);

        setTimeout(() => {
            notice.style.animation = 'stripeSlideOut 0.25s ease-in';
            setTimeout(() => {
                if (notice.parentNode) {
                    notice.parentNode.removeChild(notice);
                }
            }, 250);
        }, 5500);
    }

    function initializeEventListeners() {
        document.querySelectorAll('[data-cloudsignals-checkout]').forEach(button => {
            button.addEventListener('click', event => {
                event.preventDefault();
                createCheckoutSession(event.currentTarget);
            });
        });

        document.querySelectorAll('[data-cloudsignals-free]').forEach(button => {
            button.addEventListener('click', event => {
                event.preventDefault();
                startFreePlan(event.currentTarget);
            });
        });

        document.querySelectorAll('[data-contact-sales]').forEach(button => {
            button.addEventListener('click', event => {
                event.preventDefault();
                contactSales(event.currentTarget);
            });
        });

        document.querySelectorAll('[data-stripe-portal]').forEach(button => {
            button.addEventListener('click', event => {
                event.preventDefault();
                redirectToCustomerPortal(event.currentTarget);
            });
        });
    }

    function installStyles() {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes stripeSlideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }

            @keyframes stripeSlideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }

    normalizeConfig();
    installStyles();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeEventListeners);
    } else {
        initializeEventListeners();
    }

    window.AiVRICCloudSignalsCheckout = {
        createCheckoutSession,
        redirectToCustomerPortal,
        startFreePlan,
        contactSales,
        showSuccess
    };
})();
