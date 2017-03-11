# On Demand Scripted Instances

In order to provide flexible methods of generating of problem instances, this system is being introduced. Challenge writers can currently generate instances before the competition starts, by script or by hand. This system will allow them to instead write a python module which will be called upon for instance parameters and files each time a user accesses the challenge.

#### User perspective: 
From the user’s perspective the generated files will come from the same system as the static files. (i.e. the access path will be /files/{random_hex_string}/{filename}.{ext}) 

#### Code storage: 
The scripts for instance generation will be stored in CTFd/generators folder. These will be written as standalone scripts with accompanying data or programs (e.g. a vulnerable binary, or templated source file) packaged alongside it. The script must be implemented to take a certain argument list (defined below) and a DB entry in the challenges table will reference the location of this script. 

**Concern on code storage:** If we desire to scale our CTF by firing up more web servers the files will need to be synced across all web servers. (This problem exists with the uploads directory as well) Two solutions that I can think of. A) Us the SQL DB as the code storage backend. B) Use a utility such as lsyncd to synchronise the code folders. I have decided on option B due to a variety of difficulties with option A. The result is that if the script is changed or added on one server there will be up to a few seconds where users will receive inconsistent results, or even errors depending on the extent of the change. This is because with the servers will each have different versions of the code running. 

#### DB modifications:
* Add a  “generator” field that indicates the relative path of the generator module inside the CTFd/generators folder. 
* Add a “generated” field to the file object to inform it that the generator script should be called to receive the code

#### Running the scripts: 
At runtime the webapp will be watching for calls to generated challenges. When a user requests the challenge the script which is pointed to in the DB will be called as a subprocess and it’s output will be received through stdout. The result will then be stored in a cache to prevent it from being reloaded unless the cache is cleared. A watcher for file changes will need to be created to clear the cache on file change.  


#### Generator API: 
To be an instance generator the script implement the following cli interface:

`(“config” | “file”) UID [FILENAME]`

UID in both cases will be a 16 digit hexadecimal identifier associated the team. This token should be used as a tracking token to store configurations, or as a seed for any pseudo-random processes. This is used as in part to achieve the idempotency constraint.

The first argument will be “config” or “file” and will specify what behavior to carry out as follows
* `config`: Creates the parameters used by Jinja to render the challenge template and tells which files are available to the user. Returned to stdout will be a JSON encoded dictionary with “params” and “files” as top level keys. The “params” key will contain another JSON encoded dict. This dict will be decoded and passed Jinja2 for template rendering. The “files” key will contain a list of string filenames. These filenames will be passed exactly as given back as part of the “file” call. These can be thought of as a kind of tracking token and can have any name, but should contain the proper extension unless internationally malformed to fit the challenge. 
* `file`: Push the file through stdout which corresponds to the UID and FILENAME given in the call. This can be a binary stream including image files. The stdout file object of the subprocess will be streamed to the user as a file attachment using Flask’s `send_file` function. 

The functions provided by this API must be idempotent to allow caching of generated files and parameters. If the code file gets reloaded the cache will be cleared and populated again as the users make requests. This is mandated by user expectations as well as performance. 

