"""Page router connecting app.py to modular pages/ modules."""

from pages import (
    about,
    analytics,
    dashboard,
    history,
    image_detection,
    model_info,
    multi_face_detection,
    settings,
    webcam_detection,
)


def render_page(name: str, detector, classifier) -> None:
    mapping = {
        "Dashboard": lambda: dashboard.render(classifier),
        "Emotion Detection": lambda: image_detection.render(detector, classifier),
        "Live Webcam Detection": lambda: webcam_detection.render(detector, classifier),
        "Multi-Face Detection": lambda: multi_face_detection.render(detector, classifier),
        "Emotion Analytics": lambda: analytics.render(),
        "Detection History": lambda: history.render(),
        "Model Information": lambda: model_info.render(),
        "About Project": lambda: about.render(),
        "Settings": lambda: settings.render(),
    }
    handler = mapping.get(name)
    if handler:
        handler()
