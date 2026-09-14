# Quotation Navigation and Inward Order Completion

## Navigation
- Keep only Quotations and Inward Orders in the main left sidebar.
- Add a quotation-only secondary navigation bar containing Projects and every existing quotation settings page.
- Show this secondary navigation on Projects, quotation wizard/preview pages, and all Settings pages; hide it in Inward Orders and Login.
- Keep Projects as the default Quotations destination and preserve all existing page behavior.

## Remaining requested flow
- Add the user initials badge to the app header.
- Render Login without the app shell.
- Add “Move to Inward Order” to Completed quotation cards, open the existing form, prevent duplicate conversion, and refresh the Inward Orders list.
- Add the `inward_orders` database schema with grants and access policy so records persist online.

## Quality checks
- Complete route-specific page metadata where needed.
- Run the project validation and test desktop, collapsed-sidebar, mobile, login, quotation settings navigation, conversion, and inward-order flows in the browser.
