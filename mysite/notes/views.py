from django.shortcuts import get_object_or_404
from django.http import JsonResponse, HttpResponseNotFound, HttpResponseBadRequest, HttpResponse
from django.views.decorators.csrf import csrf_exempt
import json
import logging

from .models import EncryptedNote

logger = logging.getLogger(__name__)



@csrf_exempt
def test_view(request, note_id):
    return JsonResponse({"status": "ok"})

@csrf_exempt
def note_view(request, note_id):
    logger.info(f'note_view called with note_id: {note_id}, method: {request.method}')
    try:
        if request.method == 'GET':
            logger.info(f'GET request for note_id: {note_id}')
            try:
                note = EncryptedNote.objects.get(id=note_id)
                response_data = {
                    "salt": note.salt,
                    "iv": note.iv,
                    "ciphertext": note.ciphertext,
                    "tag": note.tag
                }
                logger.info(f'GET request successful for note_id: {note_id}')
                return JsonResponse(response_data)
            except EncryptedNote.DoesNotExist:
                logger.warning(f'Note not found for note_id: {note_id}')
                response_data = {"error": "Note not found"}
                return HttpResponse(json.dumps(response_data), status=404, content_type="application/json")

        elif request.method == 'PUT':
            logger.info(f'PUT request for note_id: {note_id}')
            try:
                data = json.loads(request.body)
                salt = data.get('salt')
                iv = data.get('iv')
                ciphertext = data.get('ciphertext')
                tag = data.get('tag')

                if not all([salt, iv, ciphertext, tag]):
                    logger.warning(f'Missing data in PUT request for note_id: {note_id}')
                    response_data = {"error": "Missing data"}
                    return HttpResponseBadRequest(json.dumps(response_data), content_type="application/json")

                note, created = EncryptedNote.objects.update_or_create(
                    id=note_id,
                    defaults={
                        'salt': salt,
                        'iv': iv,
                        'ciphertext': ciphertext,
                        'tag': tag
                    }
                )
                status_code = 201 if created else 200
                logger.info(f'PUT request successful for note_id: {note_id}, created: {created}')
                return JsonResponse({"status": "ok"}, status=status_code)
            except json.JSONDecodeError as e:
                logger.exception(f'Invalid JSON in PUT request for note_id: {note_id}')
                response_data = {"error": "Invalid JSON"}
                return HttpResponseBadRequest(json.dumps(response_data), content_type="application/json")
            except Exception as e:
                logger.exception(f'Exception in PUT request for note_id: {note_id}')
                response_data = {"error": str(e)}
                return HttpResponse(json.dumps(response_data), status=500, content_type="application/json")

        elif request.method == 'DELETE':
            logger.info(f'DELETE request for note_id: {note_id}')
            try:
                note = EncryptedNote.objects.get(id=note_id)
                note.delete()
                logger.info(f'DELETE request successful for note_id: {note_id}')
                return JsonResponse({"status": "deleted"})
            except EncryptedNote.DoesNotExist:
                logger.warning(f'Note not found for DELETE request, note_id: {note_id}')
                response_data = {"error": "Note not found"}
                return HttpResponse(json.dumps(response_data), status=404, content_type="application/json")

        else:
            logger.warning(f'Invalid method: {request.method}')
            response_data = {"error": "Method not allowed"}
            return HttpResponse(json.dumps(response_data), status=405, content_type="application/json")
    except Exception as e:
        logger.exception(f'Unhandled exception for note_id: {note_id}')
        response_data = {"error": str(e)}
        return HttpResponse(json.dumps(response_data), status=500, content_type="application/json")
