from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse

# Endpoint public pour le keep-alive (empêche Render de s'endormir)
def ping(request):
    return JsonResponse({'status': 'ok', 'message': 'SeneSchool backend is alive'})

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Keep-alive endpoint (public, no auth required)
    path('api/ping/', ping, name='ping'),

    # API endpoints
    path('api/auth/', include('accounts.urls')),
    path('api/core/', include('core.urls')),
    path('api/academics/', include('academics.urls')),
    path('api/students/', include('students.urls')),
    path('api/evaluations/', include('evaluations.urls')),
    path('api/finance/', include('finance.urls')),
]

# Servir les fichiers médias en développement
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
