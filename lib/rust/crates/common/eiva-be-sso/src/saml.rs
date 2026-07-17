#![allow(dead_code)]
use crate::types::*;
use base64::Engine;

pub struct SamlValidator {
    config: SsoConfig,
}

impl SamlValidator {
    pub fn new(config: SsoConfig) -> Self {
        Self { config }
    }

    /// Decode and parse a base64-encoded SAML response.
    /// This is a basic implementation; production should verify XML signatures.
    pub fn parse_response(&self, saml_response_b64: &str) -> Result<UserInfo, SsoError> {
        let engine = base64::engine::general_purpose::STANDARD;
        let decoded = engine
            .decode(saml_response_b64)
            .map_err(|e| SsoError::InvalidSamlResponse(format!("Base64 decode error: {}", e)))?;

        let xml_str = String::from_utf8_lossy(&decoded);

        // Basic extraction: look for NameID and attributes in the SAML assertion
        let name_id = self.extract_xml_value(&xml_str, "saml:NameID")
            .or_else(|| self.extract_xml_value(&xml_str, "NameID"))
            .unwrap_or_default();

        let email = self.extract_xml_attribute(&xml_str, "Attribute", "email")
            .or_else(|| self.extract_xml_attribute(&xml_str, "Attribute", "Email"))
            .or_else(|| self.extract_xml_attribute(&xml_str, "Attribute", "mail"));

        let username = self.extract_xml_attribute(&xml_str, "Attribute", "username")
            .or_else(|| self.extract_xml_attribute(&xml_str, "Attribute", "Username"));

        Ok(UserInfo {
            sub: name_id.clone(),
            preferred_username: username.or_else(|| Some(name_id.clone())),
            email,
            name: self.extract_xml_attribute(&xml_str, "Attribute", "displayName"),
            roles: vec![],
        })
    }

    fn extract_xml_value(&self, xml: &str, tag: &str) -> Option<String> {
        let open = format!("<{}>", tag);
        let close = format!("</{}>", tag);
        xml.find(&open).and_then(|start| {
            let content_start = start + open.len();
            xml[content_start..].find(&close).map(|end| {
                xml[content_start..content_start + end].trim().to_string()
            })
        })
    }

    fn extract_xml_attribute(&self, xml: &str, element: &str, attr_name: &str) -> Option<String> {
        // Search for <Attribute Name="attr_name">Value</Attribute>
        let search = format!("Attribute Name=\"{}\"", attr_name);
        xml.find(&search).and_then(|start| {
            let rest = &xml[start..];
            rest.find('>').and_then(|tag_end| {
                let after_tag = &rest[tag_end + 1..];
                let close_tag = format!("</{}>", element);
                after_tag.find(&close_tag).map(|value_end| {
                    after_tag[..value_end].trim().to_string()
                })
            })
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_xml_value() {
        let config = SsoConfig {
            enabled: true,
            provider: SsoProvider::Saml,
            url: "".into(),
            realm: None,
            client_id: "".into(),
            client_secret: "".into(),
            redirect_uri: "".into(),
            scope: "".into(),
        };
        let validator = SamlValidator::new(config);
        let xml = "<saml:NameID>user@example.com</saml:NameID>";
        assert_eq!(
            validator.extract_xml_value(xml, "saml:NameID"),
            Some("user@example.com".into())
        );
    }
}
