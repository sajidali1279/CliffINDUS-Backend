# --------------------------------------------------------
# ✅ USER UTILITIES — Verification Email Helper
# --------------------------------------------------------
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone

def send_verification_email(user):
    """
    Sends a simple verification email.
    For now, just notifies the user that verification is pending.
    (Future: replace with tokenized verification link.)
    """
    subject = "Verify your CliffINDUS account"
    message = (
        f"Hello {user.username},\n\n"
        "Thank you for registering at CliffINDUS.\n"
        "Your account is currently pending verification.\n"
        "An administrator will review your information shortly.\n\n"
        "If this was not you, please ignore this email.\n\n"
        "— CliffINDUS Team"
    )
    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "no-reply@cliffindus.com")
    try:
        send_mail(subject, message, from_email, [user.email], fail_silently=True)
    except Exception:
        pass  # Safe fallback in dev environments
from cliffindus_backend.users.models import User

def get_visible_users_for(user):
    """
    Returns queryset of users visible to the current user:
    - Admin: can see everyone
    - Wholesaler/Retailer/Consumer: can see only themselves
    """
    if not getattr(user, "is_authenticated", False):
        return User.objects.none()

    role = getattr(user, "role", None)
    if role == "admin":
        return User.objects.all()
    else:
        return User.objects.filter(id=user.id)