"DROP POLICY \"Temp update\" ON products;"  
"DROP POLICY \"Users can update their own products\" ON products;"  
"CREATE POLICY \"Users can update their own products\" ON products FOR UPDATE USING (auth.uid()::uuid = user_id);" 
