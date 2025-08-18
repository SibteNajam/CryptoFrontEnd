first write login pages then add slices for it
then create store and add reducer 
provide it to root layout
create separate file for client provider to make it a client componet so to use redux functionalities
created types for authentication login signup and return types also 



created custom hooks so to make code clean not to use  dispatch in main file code separation of concern 
write all dispatches for related reducer in a separte custom hoook

same process for chat 
when logged in a page of chat which show all users and a chat box if user is selected



added grmmar correction 

1..whenever  user type it call input change function set messagetext state 
2..and as it changes useeffect called and check if length>3 then it call check grammar
3..in custom hook checkgramer is called and debouncing logic here timeout or some checks if empty string return immediate
4..then here if all checks cleared it calls ucheck grammar of Grammar Service class where apii is called and then result and original text is returned
5.. and then result is set in grammarresult 


cannot properly document becasue time is not enough to document side by side properly 
