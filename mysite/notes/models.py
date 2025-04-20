from django.db import models

class EncryptedNote(models.Model):
    id = models.CharField(max_length=255, primary_key=True)  # Note path/ID
    salt = models.TextField()  # Base64 encoded
    iv = models.TextField()    # Base64 encoded
    ciphertext = models.TextField() # Base64 encoded
    tag = models.TextField()   # Base64 encoded (for GCM)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.id
