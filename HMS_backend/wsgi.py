"""
HostelFlow WSGI Production Entry Point.
Compatible with Gunicorn, Waitress, and cloud hosting runtimes.
Usage:
  gunicorn -w 4 -b 0.0.0.0:$PORT "wsgi:app"
"""
from app import app

if __name__ == "__main__":
    app.run()
