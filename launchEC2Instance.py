import os
import time
import boto
import config
import boto.manage.cmdshell
from fabric.api import *
import logging

# Default AMI is Ubuntu 11.04 Natty EBS boot
# taken from http://alestic.com/
def launch_instance(ami='ami-fd589594',
                    instance_type='t1.micro',
                    key_name='solvejs',
                    key_extension='.pem',
                    key_dir='~/.ssh',
                    group_name='solvejs',
                    ssh_port=22,
                    cidr='0.0.0.0/0',
                    tag='solvejs',
                    user_data=None,
                    cmd_shell=True,
                    login_user='ubuntu',
                    ssh_passwd=None):
    """
    Launch an instance and wait for it to start running.
    Returns a tuple consisting of the Instance object and the CmdShell
    object, if request, or None.

    ami        The ID of the Amazon Machine Image that this instance will
               be based on.  Default is a 64-bit Amazon Linux EBS image.

    instance_type The type of the instance.

    key_name   The name of the SSH Key used for logging into the instance.
               It will be created if it does not exist.

    key_extension The file extension for SSH private key files.
    
    key_dir    The path to the directory containing SSH private keys.
               This is usually ~/.ssh.

    group_name The name of the security group used to control access
               to the instance.  It will be created if it does not exist.

    ssh_port   The port number you want to use for SSH access (default 22).

    cidr       The CIDR block used to limit access to your instance.

    tag        A name that will be used to tag the instance so we can
               easily find it later.

    user_data  Data that will be passed to the newly started
               instance at launch and will be accessible via
               the metadata service running at http://169.254.169.254.

    cmd_shell  If true, a boto CmdShell object will be created and returned.
               This allows programmatic SSH access to the new instance.

    login_user The user name used when SSH'ing into new instance.  The
               default is 'ec2-user'

    ssh_passwd The password for your SSH key if it is encrypted with a
               passphrase.
    """
    
    # Set up a log file for debugging purposes.
    logging.basicConfig(filename="boto.log", level=logging.DEBUG)

    cmd = None
    
    # Create a connection to EC2 service.
    # You can pass credentials in to the connect_ec2 method explicitly
    # or you can use the default credentials in your ~/.boto config file
    # as we are doing here.
    ec2 = boto.connect_ec2(config.AWS_ACCESS_KEY, config.AWS_SECRET_KEY)

    # Check to see if specified keypair already exists.
    # If we get an InvalidKeyPair.NotFound error back from EC2,
    # it means that it doesn't exist and we need to create it.
    try:
        key = ec2.get_all_key_pairs(keynames=[key_name])[0]
    except ec2.ResponseError, e:
        if e.code == 'InvalidKeyPair.NotFound':
            print 'Creating keypair: %s' % key_name
            # Create an SSH key to use when logging into instances.
            key = ec2.create_key_pair(key_name)
            
            # AWS will store the public key but the private key is
            # generated and returned and needs to be stored locally.
            # The save method will also chmod the file to protect
            # your private key.
            key.save(key_dir)
        else:
            raise

    # Check to see if specified security group already exists.
    # If we get an InvalidGroup.NotFound error back from EC2,
    # it means that it doesn't exist and we need to create it.
    try:
        group = ec2.get_all_security_groups(groupnames=[group_name])[0]
    except ec2.ResponseError, e:
        if e.code == 'InvalidGroup.NotFound':
            print 'Creating Security Group: %s' % group_name
            # Create a security group to control access to instance via SSH.
            group = ec2.create_security_group(group_name,
                                              'A group that allows SSH access')
        else:
            raise

    # Add a rule to the security group to authorize SSH traffic
    # on the specified port.
    try:
        group.authorize('tcp', ssh_port, ssh_port, cidr)
    except ec2.ResponseError, e:
        if e.code == 'InvalidPermission.Duplicate':
            print 'Security Group: %s already authorized' % group_name
        else:
            raise

    # Now start up the instance.  The run_instances method
    # has many, many parameters but these are all we need
    # for now.
    reservation = ec2.run_instances(ami,
                                    key_name=key_name,
                                    security_groups=[group_name],
                                    instance_type=instance_type,
                                    user_data=user_data)

    # Find the actual Instance object inside the Reservation object
    # returned by EC2.

    instance = reservation.instances[0]

    # The instance has been launched but it's not yet up and
    # running.  Let's wait for it's state to change to 'running'.

    print 'waiting for instance'
    while instance.state != 'running':
        print '.'
        time.sleep(5)
        instance.update()
    print 'done'

    # Let's tag the instance with the specified label so we can
    # identify it later.
    instance.add_tag(tag)

    # The instance is now running, let's try to programmatically
    # SSH to the instance using Paramiko via boto CmdShell.
    if cmd_shell:
        time.sleep(30) # EC2 won't start accepting incoming connections for bit.
        key_path = os.path.join(os.path.expanduser(key_dir),
                                key_name+key_extension)
        cmd = boto.manage.cmdshell.sshclient_from_instance(instance,
                                                          key_path,
                                                          user_name=login_user)

    print 'launched instance with public DNS ' + str(instance.public_dns_name)
    return (instance, cmd)

def bootstrap_instance():
    (instance, cmd) = launch_instance()
    print "cmd is " + str(cmd)
    
    # Install Google Chrome
    cmd.run("echo \"deb http://dl.google.com/linux/deb/ stable non-free main\" | sudo tee -a /etc/apt/sources.list")
    cmd.run("wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | sudo apt-key add - ")
    cmd.run("sudo apt-get update")
    cmd.run("sudo apt-get install -y google-chrome-stable")
    
    # Install the xvfb X11 server
    cmd.run("sudo apt-get install -y xvfb")

	# Install our 'screencap' script that allows us to start xvfb as a service.
	cmd.run("sudo wget --output-document=/etc/init.d/screencap http://solvejs.s3.amazonaws.com/screencap")
	cmd.run("sudo chmod 700 /etc/init.d/screencap")
	
	# Run the xvfb service!
	cmd.run("sudo /etc/init.d/screencap start")
	
	# Download the sample Google Chrome user files. We'll need these to succeed at launching Chrome.
	cmd.run("wget --output-document=/tmp/GoogleChromeLocalStateSample http://solvejs.s3.amazonaws.com/GoogleChromeLocalStateSample")
	cmd.run("wget --output-document=/tmp/GoogleChromePreferencesSample http://solvejs.s3.amazonaws.com/GoogleChromePreferencesSample")

	cmd.run("mkdir /tmp/chrome")
	numChromeInstances = 12
	for i in range(0, numChromeInstances):
		currChromeDataDir = "/tmp/chrome/" + str(i)
		cmd.run("mkdir " + currChromeDataDir)
		cmd.run("mkdir " + currChromeDataDir + "/Default")
		cmd.run("cp /tmp/GoogleChromeLocalStateSample " + currChromeDataDir + "/Local\ State")
		cmd.run("cp /tmp/GoogleChromePreferencesSample " + currChromeDataDir + "/Default/Preferences")
		cmd.run("DISPLAY=:1 google-chrome http://www.example.com --user-data-dir=" + currChromeDataDir)
    
    # Terminate the session?
    cmd.run("exit")
