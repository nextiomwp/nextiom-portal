-- Migration: Add Ticket SMS Notification Trigger
-- Description: Sends SMS to admin numbers when customer creates a ticket, and to customer when admin assigns a ticket.

-- 1. Create function to trigger SMS notification on ticket insert/update
CREATE OR REPLACE FUNCTION public.trg_ticket_sms_notification()
RETURNS TRIGGER AS $$
DECLARE
  url_val TEXT;
  key_val TEXT;
  settings_rec RECORD;
  cust_rec RECORD;
  sms_msg TEXT;
  admin_phone TEXT;
BEGIN
  -- Retrieve the decrypted secrets from the vault
  SELECT decrypted_secret INTO url_val FROM vault.decrypted_secrets WHERE name = 'project_url' LIMIT 1;
  SELECT decrypted_secret INTO key_val FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1;

  IF url_val IS NULL OR key_val IS NULL THEN
    RAISE WARNING 'project_url or service_role_key not found in vault. Skipping ticket SMS notification.';
    RETURN NULL;
  END IF;

  -- Load SMS settings
  SELECT sms_enabled, ticket_sms, ticket_sms_admin_numbers INTO settings_rec FROM public.sms_settings LIMIT 1;
  IF NOT FOUND OR NOT settings_rec.sms_enabled OR NOT settings_rec.ticket_sms THEN
    RETURN NULL;
  END IF;

  -- Handle INSERT (New Ticket created)
  IF (TG_OP = 'INSERT') THEN
    -- Get customer name
    SELECT name INTO cust_rec FROM public.customers WHERE id = NEW.customer_id;
    
    -- Format message containing customer name, selected main quick action and subject only
    sms_msg := 'Customer: ' || COALESCE(cust_rec.name, 'Unknown') || E'\n' ||
               'Quick Action: ' || COALESCE(NEW.selected_quick_action, NEW.department, 'None') || E'\n' ||
               'Subject: ' || NEW.subject;

    -- Loop through admin numbers and dispatch SMS
    IF settings_rec.ticket_sms_admin_numbers IS NOT NULL AND array_length(settings_rec.ticket_sms_admin_numbers, 1) > 0 THEN
      FOREACH admin_phone IN ARRAY settings_rec.ticket_sms_admin_numbers LOOP
        IF admin_phone IS NOT NULL AND admin_phone != '' THEN
          PERFORM net.http_post(
            url := url_val || '/functions/v1/send-sms',
            headers := jsonb_build_object(
              'Content-Type', 'application/json',
              'Authorization', 'Bearer ' || key_val
            ),
            body := jsonb_build_object(
              'phone', admin_phone,
              'message', sms_msg,
              'type', 'ticket_created'
            )
          );
        END IF;
      END LOOP;
    END IF;

  -- Handle UPDATE (Ticket assigned)
  ELSIF (TG_OP = 'UPDATE') THEN
    -- Trigger only if assignee changed and is not null
    IF (NEW.assignee IS DISTINCT FROM OLD.assignee AND NEW.assignee IS NOT NULL AND NEW.assignee != '') THEN
      -- Get customer phone and name
      SELECT name, phone INTO cust_rec FROM public.customers WHERE id = NEW.customer_id;
      
      IF cust_rec.phone IS NOT NULL AND cust_rec.phone != '' THEN
        sms_msg := 'Dear ' || COALESCE(cust_rec.name, 'Customer') || ', your ticket "' || NEW.subject || '" has been assigned to ' || NEW.assignee || '. - Team Nextiom';
        
        PERFORM net.http_post(
          url := url_val || '/functions/v1/send-sms',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || key_val
          ),
          body := jsonb_build_object(
            'phone', cust_rec.phone,
            'message', sms_msg,
            'type', 'ticket_assigned',
            'customerId', NEW.customer_id
          )
        );
      END IF;
    END IF;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop triggers if they exist and recreate
DROP TRIGGER IF EXISTS trg_ticket_sms_insert ON public.tickets;
CREATE TRIGGER trg_ticket_sms_insert
  AFTER INSERT ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_ticket_sms_notification();

DROP TRIGGER IF EXISTS trg_ticket_sms_update ON public.tickets;
CREATE TRIGGER trg_ticket_sms_update
  AFTER UPDATE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_ticket_sms_notification();
