const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
puppeteer.use(StealthPlugin());

class UdyamScraper {
	constructor() {
		this.browser = null;
		this.page = null;
		this.formData = {
			fields: [],
			validationRules: {},
			structure: {},
			steps: [],
		};
	}

	async initialize() {
		try {
			this.browser = await puppeteer.launch({
				headless: false,
			});
			this.page = await this.browser.newPage();

			await this.page.setUserAgent(
				"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
			);
			await this.page.setViewport({
				width: 1366,
				height: 768,
			});
			console.log("browser started");
		} catch (err) {
			console.log(err);
		}
	}

	async navigateUdyam() {
		try {
			const url = "https://udyamregistration.gov.in/UdyamRegistration.aspx";
			await this.page.goto(url, {
				waitUntil: "networkidle2",
				timeout: 30000,
			});
			await this.page.waitForSelector("form", {
				timeout: 10000,
			});
			console.log("page loaded");
		} catch (error) {
			console.error("Failed to navigate to Udyam portal:", error);
			throw error;
		}
	}
	async extractFormFields() {
		try {
			const formFields = await this.page.evaluate(() => {
				const fields = [];
				const inputs = document.querySelectorAll("input , select , textarea");
				inputs.forEach((input, index) => {
					const field = {
						id: input.id || `field_${index}`,
						name: input.name || "",
						type: input.type || input.tagName.toLowerCase(),
						placeholder: input.placeholder || "",
						required: input.required || input.hasAttribute("required"),
						maxLength: input.maxLength || null,
						pattern: input.pattern || "",
						className: input.className || "",
						value: input.value || "",
						disabled: input.disabled,
						readonly: input.readOnly,
					};
					const label = document.querySelector(`label[for="${input.id}"]`);
					if (label) {
						field.label = label.textContent.trim();
					}

					if (input.hasAttribute("data-val")) {
						field.validation = {};
						Array.from(input.attributes).forEach((attr) => {
							if (attr.name.startsWith("data-val-")) {
								field.validation[attr.name] = attr.value;
							}
						});
					}
					fields.push(field);
				});
				return fields;
			});
			console.log(`Extracted ${formFields.length} form fields`);
			this.formData.fields = formFields;
			return formFields;
		} catch (error) {
			console.error("Failed to extract form fields:", error);
			throw error;
		}
	}
	async extractValidationRules() {
		try {
			const validationRules = await this.page.evaluate(() => {
				const rules = {};
				const inputs = document.querySelectorAll("input");
				inputs.forEach((input) => {
					const fieldId = input.id || input.name;
					if (fieldId) {
						rules[fieldId] = {
							pattern: input.pattern || null,
							required: input.required,
							type: input.type,
							minLength: input.minLength || null,
							maxLength: input.maxLength || null,
						};
					}
				});
				console.log(rules);
				return rules;
			});

			this.formData.validationRules = validationRules;
			console.log("Extracted validation rules", validationRules);
			return validationRules;
		} catch (error) {
			console.error("Failed to extract validation rules:", error);
			throw error;
		}
	}

	async extractUIStructure() {
		try {
			const structure = await this.page.evaluate(() => {
				const getElementStructure = (element) => {
					return {
						tagName: element.tagName,
						id: element.id,
						className: element.className,
						innerHTML:
							element.innerHTML.length > 1000
								? element.innerHTML.substring(0, 1000) + "..."
								: element.innerHTML,
						attributes: Array.from(element.attributes).reduce((attrs, attr) => {
							attrs[attr.name] = attr.value;
							return attrs;
						}, {}),
						children: Array.from(element.children).map((child) => ({
							tagName: child.tagName,
							id: child.id,
							className: child.className,
							textContent: child.textContent.trim().substring(0, 200),
						})),
					};
				};
				const form = document.querySelector("form");
				const formStructure = form ? getElementStructure(form) : null;
				const steps = [];
				const stepContainers = document.querySelectorAll(
					'[class*="step"], [id*="step"], .tab-content, .panel'
				);
				stepContainers.forEach((container, index) => {
					steps.push({
						index: index + 1,
						id: container.id,
						className: container.className,
						visible: !container.hidden && container.style.display !== "none",
						fields: Array.from(
							container.querySelectorAll("input, select, textarea")
						).map((field) => ({
							id: field.id,
							name: field.name,
							type: field.type,
						})),
					});
				});

				const styles = Array.from(document.styleSheets)
					.map((sheet) => {
						try {
							return Array.from(sheet.cssRules)
								.map((rule) => rule.cssText)
								.join("\n");
						} catch (e) {
							return "";
						}
					})
					.join("\n");

				return {
					form: formStructure,
					steps: steps,
					styles: styles.substring(0, 5000), 
					layout: {
						width: window.innerWidth,
						height: window.innerHeight,
						title: document.title,
					},
				};
			});

			this.formData.structure = structure;
			console.log("Extracted UI structure", structure);
			return structure;
		} catch (error) {
			console.error("Failed to extract UI structure:", error);
			throw error;
		}
	}
	async extractCompleteFormData() {
		try {
			console.log("Starting complete form data extraction...");

			await this.navigateUdyam();
			await this.extractFormFields();
			await this.extractValidationRules();
			await this.extractUIStructure();

			const fs = require("fs");
			fs.writeFileSync(
				"udyam-form-data.json",
				JSON.stringify(this.formData, null, 2)
			);

			console.log("Form data extraction completed");
			console.log("Data saved to udyam-form-data.json");

			return this.formData;
		} catch (error) {
			console.error("Error during form data extraction:", error);
			throw error;
		}
	}
}
async function scrapeUdyamForm() {
	const scraper = new UdyamScraper();

	try {
		await scraper.initialize();
		const formData = await scraper.extractCompleteFormData();

		console.log("Scraping completed successfully!");
		console.log("Form fields found:", formData.fields.length);
		console.log(
			"Validation rules:",
			Object.keys(formData.validationRules).length
		);

		return formData;
	} catch (error) {
		console.error("Scraping failed:", error);
	} finally {
		await scraper.browser.close();
	}
}

// Export for use in other modules
module.exports = { UdyamScraper, scrapeUdyamForm };

// Run if called directly
if (require.main === module) {
	scrapeUdyamForm();
}
