"""
SHL Catalog Scraper
Fetches individual test solutions from the SHL product catalog.
The catalog listing is JavaScript-rendered, so we:
  1. Try to fetch catalog pages with requests (works if server-rendered)
  2. Fall back to the seed catalog JSON
Individual product detail pages ARE server-rendered and accessible.
"""

import json
import logging
import re
import time
from pathlib import Path
from typing import Optional

import requests
from bs4 import BeautifulSoup

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

CATALOG_URL = "https://www.shl.com/solutions/products/product-catalog/"
BASE_URL = "https://www.shl.com"
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

SEED_PATH = Path(__file__).parent / "catalog_seed.json"
CACHE_PATH = Path(__file__).parent / "catalog_cache.json"


def load_seed_catalog() -> list[dict]:
    """Load the seed catalog from JSON file."""
    with open(SEED_PATH, "r") as f:
        data = json.load(f)
    logger.info(f"Loaded {len(data)} assessments from seed catalog")
    return data


def save_cache(catalog: list[dict]) -> None:
    """Save scraped catalog to cache file."""
    with open(CACHE_PATH, "w") as f:
        json.dump(catalog, f, indent=2)
    logger.info(f"Saved {len(catalog)} assessments to cache")


def load_cache() -> Optional[list[dict]]:
    """Load catalog from cache if it exists."""
    if CACHE_PATH.exists():
        with open(CACHE_PATH, "r") as f:
            data = json.load(f)
        if data:
            logger.info(f"Loaded {len(data)} assessments from cache")
            return data
    return None


def parse_product_page(url: str, session: requests.Session) -> Optional[dict]:
    """Parse an individual product detail page."""
    try:
        resp = session.get(url, headers=HEADERS, timeout=15)
        if resp.status_code != 200:
            return None

        soup = BeautifulSoup(resp.text, "html.parser")

        # Extract name from title or h1
        name = ""
        h1 = soup.find("h1")
        if h1:
            name = h1.get_text(strip=True)
        if not name:
            title = soup.find("title")
            if title:
                name = title.get_text(strip=True).split(" | ")[0]

        if not name:
            return None

        # Extract description - look for meta description or main content
        description = ""
        meta_desc = soup.find("meta", {"name": "description"})
        if meta_desc:
            description = meta_desc.get("content", "")

        # Try to get more content from page body
        content_area = soup.find("main") or soup.find("article") or soup.find("div", {"class": re.compile(r"content|product|detail")})
        if content_area:
            paragraphs = content_area.find_all("p")
            if paragraphs:
                body_text = " ".join(p.get_text(strip=True) for p in paragraphs[:5])
                if body_text:
                    description = description + " " + body_text if description else body_text

        # Look for test type codes in the page text
        page_text = soup.get_text()
        test_type = ""
        test_type_label = ""

        # Common test type patterns
        type_patterns = {
            "A": "Ability & Aptitude",
            "B": "Biodata & Situational Judgment",
            "C": "Competencies",
            "D": "Development & 360",
            "E": "Assessment Exercises",
            "K": "Knowledge & Skills",
            "P": "Personality & Behavior",
            "S": "Simulations",
        }

        found_types = []
        for code, label in type_patterns.items():
            if label in page_text or f"Test Type: {code}" in page_text:
                found_types.append(code)

        if found_types:
            test_type = ",".join(found_types)
            test_type_label = ", ".join(type_patterns[c] for c in found_types)

        # Extract duration
        duration = ""
        duration_match = re.search(r"(\d+)\s*minutes?", page_text, re.IGNORECASE)
        if duration_match:
            duration = f"{duration_match.group(1)} minutes"
        elif "untimed" in page_text.lower():
            duration = "Untimed"

        # Extract languages
        languages = ""
        lang_section = re.search(r"Language[s]?[:\s]+([\w\s,\(\)]+?)(?:\n|Test Type|Duration)", page_text)
        if lang_section:
            languages = lang_section.group(1).strip()

        return {
            "name": name,
            "url": url,
            "test_type": test_type,
            "test_type_label": test_type_label,
            "duration": duration,
            "languages": languages,
            "job_levels": "",
            "description": description.strip()[:1000],  # cap description length
        }

    except Exception as e:
        logger.warning(f"Failed to parse {url}: {e}")
        return None


def scrape_catalog_listing(session: requests.Session) -> list[str]:
    """
    Try to get product URLs from the catalog listing pages.
    Returns list of product URLs found.
    """
    product_urls = set()

    # Try paginated catalog pages with type=1 (individual tests)
    start = 0
    max_pages = 30  # Safety limit
    page_size = 12  # SHL shows ~12 per page

    for page_num in range(max_pages):
        start = page_num * page_size
        url = f"{CATALOG_URL}?start={start}&type=1"

        try:
            resp = session.get(url, headers=HEADERS, timeout=15)
            if resp.status_code != 200:
                logger.warning(f"Catalog page {page_num} returned {resp.status_code}")
                break

            soup = BeautifulSoup(resp.text, "html.parser")

            # Look for product links
            links = soup.find_all("a", href=re.compile(r"/products/product-catalog/view/|/solutions/products/product-catalog/view/"))
            if not links:
                logger.info(f"No product links found on page {page_num} (likely JS-rendered)")
                break

            page_urls = set()
            for link in links:
                href = link.get("href", "")
                if href.startswith("/"):
                    href = BASE_URL + href
                page_urls.add(href)

            if not page_urls:
                break

            # If we didn't find any new URLs, we've reached the end
            new_count = len(page_urls - product_urls)
            if new_count == 0 and page_num > 0:
                break

            product_urls.update(page_urls)
            logger.info(f"Page {page_num}: found {len(page_urls)} URLs, total: {len(product_urls)}")

            time.sleep(0.5)  # polite delay

        except Exception as e:
            logger.warning(f"Failed to fetch catalog page {page_num}: {e}")
            break

    return list(product_urls)


def scrape_full_catalog() -> list[dict]:
    """
    Main scraping function. Returns list of assessment dicts.
    Falls back to seed catalog if scraping fails.
    """
    session = requests.Session()

    logger.info("Attempting to scrape SHL catalog listing...")
    product_urls = scrape_catalog_listing(session)

    if product_urls:
        logger.info(f"Found {len(product_urls)} product URLs, scraping details...")
        catalog = []
        for i, url in enumerate(product_urls):
            product = parse_product_page(url, session)
            if product and product["name"]:
                catalog.append(product)
                logger.info(f"  [{i+1}/{len(product_urls)}] Scraped: {product['name']}")
            time.sleep(0.3)  # polite delay

        if catalog:
            save_cache(catalog)
            return catalog

    logger.info("Falling back to seed catalog (catalog listing is JS-rendered)")
    return load_seed_catalog()


def get_catalog(force_scrape: bool = False) -> list[dict]:
    """
    Get the catalog. Uses cache if available, otherwise scrapes or uses seed.
    """
    if not force_scrape:
        # Try cache first
        cached = load_cache()
        if cached:
            return cached

    # Try to scrape
    return scrape_full_catalog()


if __name__ == "__main__":
    catalog = get_catalog(force_scrape=True)
    print(f"\n✅ Catalog ready with {len(catalog)} assessments")
    for item in catalog[:5]:
        print(f"  - {item['name']} [{item['test_type']}]")
