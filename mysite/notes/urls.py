from django.urls import path
from . import views

urlpatterns = [
    path('notes/<str:note_id>', views.note_view, name='note_view'),
    path('test/<str:note_id>', views.test_view, name='test_view'), # Add the test view
]
