from fastapi import FastAPI, APIRouter, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import HTTPException
from fastapi.staticfiles import StaticFiles

app = FastAPI()

PROJECT_PREFIX_NAME = 'zenkai'

router = APIRouter(prefix=f'/{PROJECT_PREFIX_NAME}')

static_server = StaticFiles(directory='static')
app.mount('/{PROJECT_PREFIX}/static', static_server, 'static')

@router.get('/api')
async def test_response() -> JSONResponse:
  res =  {
    "user": "me",
    "message": "hello-friend.."
  }
  return JSONResponse(res)

app.include_router(router)

# print("hello")