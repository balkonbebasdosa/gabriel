from dotenv import load_dotenv
from fastapi import FastAPI

load_dotenv()

from app.schemas import AnalyzeRequest, AnalyzeResponse  # noqa: E402
from app.scorer import analyze  # noqa: E402

app = FastAPI(title="gabriel ai-service")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze_transcript(request: AnalyzeRequest) -> AnalyzeResponse:
    transcript = [m.model_dump() for m in request.transcript]
    return analyze(transcript, person_of_interest=request.person_of_interest)
